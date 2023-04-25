package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"sync"

	devcycle "github.com/devcyclehq/go-server-sdk/v2"
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
	Stack      string `json:"stack"`
}

var commandMutex = sync.RWMutex{}

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

	w.Header().Set("Content-Type", "application/json")

	if err != nil {
		log.Printf("%v", err)
		var errorResponse ErrorResponse
		if body.IsAsync {
			errorResponse = ErrorResponse{
				AsyncError: err.Error(),
			}
		} else {
			errorResponse = ErrorResponse{
				Exception: err.Error(),
			}
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(errorResponse)
	} else {
		w.Header().Add("Location", locationHeader)
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(locationResponse)
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
	commandMutex.RLock()
	defer commandMutex.RUnlock()

	if locationIsClient {
		return datastore.clients[id]
	} else {
		return datastore.commandResults[location][id]
	}
}

func parseParams(body CommandBody, err *error) []reflect.Value {
	var parsedParams = []reflect.Value{}
	for _, element := range body.Params {
		if element.Type == nil {
			if element.Value == nil {
				// if nil is passed, create a "zero value" reflect value object
				parsedParams = append(parsedParams, reflect.ValueOf(nil))
			} else {
				parsedParams = append(parsedParams, reflect.ValueOf(*element.Value))
			}
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
	commandMutex.Lock()

	if datastore.commandResults[command] == nil {
		datastore.commandResults[command] = make(map[string]any)
	}

	commandMutex.Unlock()

	var method reflect.Value

	if locationIsClient {
		log.Printf("command %s on client", command)
		apiClient := entity.(*devcycle.DVCClient)
		method = reflect.ValueOf(apiClient).MethodByName(strings.Title(command))
	} else {
		method = reflect.ValueOf(entity).MethodByName(strings.Title(command))
	}

	for index, value := range params {
		expectedType := method.Type().In(index)
		// if the reflect value is a "zero value", convert it to a zero value of the correct type for this argument
		// e.g. for a string argument, the zero value is "". It is impossible to pass nil there.
		if !value.IsValid() {
			params[index] = reflect.New(expectedType).Elem()
		}
	}

	result := method.Call(params)

	for _, value := range result {
		if value.Type().Implements(reflect.TypeOf(err).Elem()) && value.Interface() != nil {
			// panic to catch error in defer function above
			panic(value.Interface())
		}
	}

	entityType := method.Type().Out(0)
	entityName, parsedResult := parseEntity(entityType, result, err)

	response := LocationResponse{
		entityName,
		parsedResult,
		make([]string, 0),
	}

	commandMutex.Lock()
	defer commandMutex.Unlock()
	locationId := strconv.Itoa(len(datastore.commandResults[command]))
	locationHeader := "command/" + command + "/" + locationId

	datastore.commandResults[command][locationId] = result[0]

	return response, locationHeader

}

func parseEntity(entityType reflect.Type, result []reflect.Value, err *error) (string, any) {
	var parsedResult any
	parsedResult = result[0]

	// map types need to be explicitly cast to map[string]<type> for json parsing
	if entityType == reflect.TypeOf(make(map[string]devcycle.ReadOnlyVariable)) {
		variables := result[0].Interface().(map[string]devcycle.ReadOnlyVariable)
		if len(variables) > 0 {
			parsedResult = variables
		}
	} else if entityType == reflect.TypeOf(make(map[string]devcycle.Feature)) {
		features := result[0].Interface().(map[string]devcycle.Feature)
		if len(features) > 0 {
			parsedResult = features
		}
	} else if entityType == reflect.TypeOf((*devcycle.Variable)(nil)).Elem() {
		parsedResult = result[0].Interface().(devcycle.Variable)
	}

	entityName := entityType.Name()
	if entityName != "Variable" {
		entityName = "Object"
	}

	if len(result) > 1 && result[1].Interface() != nil {
		handleError(result[1].Interface(), err)
	}

	return entityName, parsedResult

}
