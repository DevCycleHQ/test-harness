package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

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

	http.HandleFunc("/helloworld", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("/helloworld called")
		fmt.Fprintf(w, "Hello!")
	})

	http.HandleFunc("/spec", specHandler)

	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatal(err)
	}
}
