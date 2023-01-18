package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"

	devcycle "github.com/devcyclehq/go-server-sdk"
	"github.com/gorilla/mux"
)

type Param struct {
	Type  *string `json:"type,omitempty"`
	Value *any    `json:"value,omitempty"`
}

type CommandBody struct {
	Command string             `json:"command"`
	IsAsync bool               `json:"isAsync"`
	User    *devcycle.DVCUser  `json:"user,omitempty"`
	Event   *devcycle.DVCEvent `json:"event,omitempty"`
	Params  []Param            `json:"params"`
}

type LocationResponse struct {
	EntityType string   `json:"entityType"`
	Data       any      `json:"data"`
	Logs       []string `json:"logs"`
}

type ErrorResponse struct {
	AsyncError string `json:"asyncError,omitempty"`
	Exception  string `json:"exception,omitempty"`
	Stack      error  `json:"stack"`
}

func handleError(r any, err *error) {
	switch x := r.(type) {
	case string:
		*err = errors.New(x)
	case error:
		*err = x
	default:
		*err = errors.New("unknown panic")
	}
}

func clientCommandHandler(w http.ResponseWriter, r *http.Request) {
	commandHandler(true, w, r)
}

func locationCommandHandler(w http.ResponseWriter, r *http.Request) {
	commandHandler(false, w, r)
}

func commandHandler(locationIsClient bool, w http.ResponseWriter, r *http.Request) {
	var body CommandBody
	jsonErr := json.NewDecoder(r.Body).Decode(&body)

	locationResponse, locationHeader, err := getCommandResponse(locationIsClient, body, w, r)

	if err == nil {
		err = jsonErr
	}
	if err != nil {
		var errorResponse ErrorResponse
		if body.IsAsync {
			errorResponse = ErrorResponse{
				AsyncError: err.Error(),
				Stack:      err,
			}
		} else {
			errorResponse = ErrorResponse{
				Exception: err.Error(),
				Stack:     err,
			}
		}

		json.NewEncoder(w).Encode(errorResponse)
	} else {
		w.Header().Set("Location", locationHeader)
		json.NewEncoder(w).Encode(locationResponse)
	}
}

func getCommandResponse(
	locationIsClient bool,
	body CommandBody,
	w http.ResponseWriter,
	r *http.Request,
) (LocationResponse, string, error) {
	var err error
	vars := mux.Vars(r)

	var location = vars["location"]
	var id = vars["id"]
	if locationIsClient {
		fmt.Printf("Location: %v %v \n", location, id)
	} else {
		fmt.Printf("Location: client %v \n", id)
	}

	params := parseParams(body, &err)
	entity := getEntityFromLocation(location, id, locationIsClient, &err)
	response, locationHeader := callMethodOnEntity(
		entity,
		body.Command,
		id,
		params,
		locationIsClient,
		&err,
	)

	return response, locationHeader, err
}

func getEntityFromLocation(location string, id string, locationIsClient bool, err *error) any {
	defer func() {
		if r := recover(); r != nil {
			handleError(r, err)
		}
	}()

	if locationIsClient {
		return datastore.clients[id]
	} else {
		return datastore.commandResults[location][id]
	}
}

func parseParams(body CommandBody, err *error) []reflect.Value {
	defer func() {
		if r := recover(); r != nil {
			handleError(r, err)
		}
	}()

	var parsedParams = []reflect.Value{}
	for _, element := range body.Params {
		if element.Type == nil {
			parsedParams = append(parsedParams, reflect.ValueOf(*element.Value))
		} else if *element.Type == "user" {
			parsedParams = append(parsedParams, reflect.ValueOf(*body.User))
		} else if *element.Type == "event" {
			parsedParams = append(parsedParams, reflect.ValueOf(*body.Event))
		}
	}

	return parsedParams
}

func callMethodOnEntity(
	entity any,
	command string,
	id string,
	params []reflect.Value,
	locationIsClient bool,
	err *error,
) (LocationResponse, string) {
	defer func() {
		if r := recover(); r != nil {
			handleError(r, err)
		}
	}()

	var method reflect.Value

	if locationIsClient {
		apiClient := entity.(devcycle.DVCClient).DevCycleApi
		auth := datastore.clientAuthContexts[id]
		params = append([]reflect.Value{reflect.ValueOf(auth)}, params...)
		method = reflect.ValueOf(apiClient).MethodByName(strings.Title(command))
	} else {
		method = reflect.ValueOf(entity).MethodByName(strings.Title(command))
	}

	result := method.Call(params)

	entityType := method.Type().Out(0).Name()
	if entityType != "Variable" {
		entityType = "Object"
	}

	response := LocationResponse{
		entityType,
		result[0].Interface(),
		make([]string, 0),
	}

	locationId := strconv.Itoa(len(datastore.commandResults[command]))
	locationHeader := "command/" + command + "/" + locationId
	datastore.commandResults[command][locationId] = result[0]

	return response, locationHeader

}
