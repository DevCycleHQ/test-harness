package main

import (
	"encoding/json"
	"github.com/devcyclehq/go-server-sdk"
	"net/http"
)

type clientRequestBody struct {
    ClientId         string   `json:"clientId"`
    SdkKey      string   `json:"sdkKey, omitempty"`
    EnableCloudBucketing bool `json:"enableCloudBucketing"`
    WaitForInitialization bool `json:"waitForInitialization"`
    Options devcycle.DVCOptions `json:"options"`
}

type clientResponseBody struct {
    Message         string   `json:"message, omitempty"`
    AsyncError      string   `json:"asyncError, omitempty"`
    Exception       string   `json:"exception, omitempty"`
}
func clientHandler(w http.ResponseWriter, r *http.Request) {
    var reqBody clientRequestBody
    err := json.NewDecoder(r.Body).Decode(&reqBody)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    } else if reqBody.ClientId == "" {
        http.Error(w, "Invalid request: missing clientId", http.StatusBadRequest)
        return
    }

    reqBody.Options.DisableLocalBucketing = reqBody.EnableCloudBucketing
    var lb *devcycle.DevCycleLocalBucketing
    var res clientResponseBody
    if reqBody.EnableCloudBucketing == false {
        lb, err = devcycle.InitializeLocalBucketing(reqBody.SdkKey, &reqBody.Options)
        if err != nil {
            res.Exception = err.Error()
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(res)
            return
        }
    }
	client, err := devcycle.NewDVCClient(reqBody.SdkKey, &reqBody.Options, lb)
	if err != nil {
        res.Exception = err.Error()
        w.WriteHeader(http.StatusOK)
    } else {
        res.Message = "success"
        datastore.clients[reqBody.ClientId] = *client
        w.WriteHeader(http.StatusCreated)
    }
	w.Header().Set("Location", "client/" + reqBody.ClientId)
	json.NewEncoder(w).Encode(res)
}
