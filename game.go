package main

import (
	"encoding/binary"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Server struct
type Server struct {
	world  *World
	people []*Person
	mux    *sync.Mutex
}

var (
	server *Server
)

func game(level string) func(w http.ResponseWriter, r *http.Request) {

	server = &Server{}
	server.mux = &sync.Mutex{}
	server.people = make([]*Person, 0)

	server.world = NewWorld()
	file, err := os.Open(level)
	if err != nil {
		panic(err)
	}
	contents, err := ioutil.ReadAll(file)
	if err != nil {
		panic(err)
	}
	server.world.Load(contents)

	ticker := time.NewTicker(WorldTickRate * time.Millisecond)
	go func() {
		for range ticker.C {
			server.mux.Lock()
			num := len(server.people)
			if num > 0 {
				server.world.Update()
				server.world.BuildSnapshots(server.people)
				for i := 0; i < num; i++ {
					person := server.people[i]
					go person.WriteBinaryToClient(person.binarySnap.Bytes())
				}
			}
			server.mux.Unlock()
		}
	}()

	return serve
}

func serve(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, r.Method, r.URL.Path)

	var path string
	if r.URL.Path == "/" {
		path = home
	} else if r.URL.Path == "/websocket" {
		server.connectSocket(w, r)
		return
	} else {
		path = dir + r.URL.Path
	}

	file, err := os.Open(path)
	if err != nil {
		path = home
		file, err = os.Open(path)
		if err != nil {
			return
		}
	}

	contents, err := ioutil.ReadAll(file)
	if err != nil {
		panic(err)
	}

	typ, ok := extensions[filepath.Ext(path)]
	if !ok {
		typ = textPlain
	}

	w.Header().Set(contentType, typ)
	w.Write(contents)
}

func (me *Server) connectSocket(writer http.ResponseWriter, request *http.Request) {
	if request.Header.Get("Origin") != "http://"+request.Host {
		http.Error(writer, "origin not allowed", 403)
		return
	}
	// TODO client's need to be given a key to avoid DOS attacks / wasting resources on non players
	// TODO http server read list of acceptable path to files preventing attacks
	// TODO editor should be publicly accesible, facilitates community and longevity
	upgrader := websocket.Upgrader{}
	connection, err := upgrader.Upgrade(writer, request, nil)
	if err != nil {
		http.Error(writer, "could not open websocket", 400)
		return
	}
	me.mux.Lock()
	person := NewPerson(connection, server.world)
	me.people = append(me.people, person)
	data := me.world.BinarySave(person)
	me.world.broadcastCount++
	binary.Write(me.world.broadcast, binary.LittleEndian, BroadcastNew)
	person.Character.BinarySave(me.world.broadcast)
	me.mux.Unlock()
	person.WriteBinaryToClient(data)
	go me.PersonConnectionLoop(person)
}

// PersonConnectionLoop func
func (me *Server) PersonConnectionLoop(person *Person) {
	for {
		_, data, err := person.Connection.ReadMessage()
		if err != nil {
			fmt.Println(err)
			person.Connection.Close()
			break
		}
		me.mux.Lock()
		person.Input(data)
		me.mux.Unlock()
	}

	char := person.Character
	char.Health = 0
	char.World.RemoveThing(char.Thing)
	char.RemoveFromBlocks()

	me.RemovePerson(person)
}

// RemovePerson func
func (me *Server) RemovePerson(person *Person) {
	me.mux.Lock()
	defer me.mux.Unlock()

	me.world.broadcastCount++
	binary.Write(me.world.broadcast, binary.LittleEndian, BroadcastDelete)
	binary.Write(me.world.broadcast, binary.LittleEndian, person.Character.NID)

	num := len(me.people)
	for i := 0; i < num; i++ {
		if me.people[i] == person {
			me.people[i] = me.people[num-1]
			me.people[num-1] = nil
			me.people = me.people[:num-1]
			return
		}
	}
}
