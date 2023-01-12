package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	devcycle "github.com/devcyclehq/go-server-sdk"
	"github.com/gorilla/mux"
)

type DataStore = struct {
	clients        map[string]devcycle.DVCClient
	commandResults map[string]map[int]any
}

var datastore = DataStore{
	make(map[string]devcycle.DVCClient),
	map[string]map[int]any{
		"variable":     make(map[int]any),
		"allVariables": make(map[int]any),
		"allFeatures":  make(map[int]any),
		"track":        make(map[int]any),
	},
}

func specHandler(w http.ResponseWriter, r *http.Request) {
	res := struct {
		Name         string   `json:"name"`
		Version      string   `json:"version"`
		Capabilities []string `json:"capabilities"`
	}{
		"Go",
		"", // TODO add branch name or SDK version here
		[]string{"EdgeDB", "LocalBucketing", "CloudBucketing"},
	}
	fmt.Println("/spec called")
	json.NewEncoder(w).Encode(res)
}

func main() {
	fmt.Printf("Starting Go proxy server at port 3000\n")

	r := mux.NewRouter()

	r.HandleFunc("/helloworld", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("/helloworld called")
		fmt.Fprintf(w, "Hello!")
	})

	r.HandleFunc("/spec", specHandler)
	r.HandleFunc("/{location}", commandHandler)

	http.Handle("/", r)

	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatal(err)
	}
}
