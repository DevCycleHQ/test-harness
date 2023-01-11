package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	devcycle "github.com/devcyclehq/go-server-sdk"
	"github.com/gorilla/mux"
)

type Param struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type CommandBody struct {
	Command string             `json:"command"`
	IsAsync bool               `json:"isAsync"`
	User    *devcycle.UserData `json:"user,omitempty"`
	Event   *devcycle.DVCEvent `json:"event,omitempty"`
	Params  []Param            `json:"params"`
}

func commandHandler(w http.ResponseWriter, r *http.Request) {
	var body CommandBody
	vars := mux.Vars(r)

	fmt.Printf("Location: %v\n", vars["location"])

	err := json.NewDecoder(r.Body).Decode(&body)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(body)
}
