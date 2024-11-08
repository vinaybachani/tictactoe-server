import { createServer } from "http";
import { Server } from "socket.io";
import express from 'express';
import path from 'path'

const app = express();

// -----------------------Deployement-----------------------
app.get("/", (req, res) => {
    res.send("API is working");
});

// -----------------------Deployement-----------------------

// Create an HTTP server and pass the Express app to it
const httpServer = createServer(app);

// Initialize the Socket.IO server with the HTTP server
const io = new Server(httpServer, {
    cors: {
        origin: "https://tic-tac-toe-client-delta.vercel.app",  // Your front-end server's URL
        methods: ["GET", "POST"],
        allowedHeaders: ['Content-Type'], // Allow necessary headers
        credentials: true,
    }
});

// Define your WebSocket listeners (same as before)
const allUsers = {};
const allRooms = [];

io.on("connection", (socket) => {

    allUsers[socket.id] = {
        socket: socket,
        online: true
    }

    socket.on("request_to_play", (data) => {
        const currentUser = allUsers[socket.id];
        currentUser.playerName = data.playerName;

        let opponentPlayer;

        for (const key in allUsers) {
            const user = allUsers[key];
            if (user.online && !user.playing && socket.id !== key) {
                opponentPlayer = user;
                break;
            }
        }

        if (opponentPlayer) {
            allRooms.push({
                player1: opponentPlayer,
                player2: currentUser
            })
            opponentPlayer.socket.emit("OpponentFound", {
                opponentName: currentUser.playerName,
                playingAs: "circle"
            })

            currentUser.socket.emit("OpponentFound", {
                opponentName: opponentPlayer.playerName,
                playingAs: "cross"
            })

            currentUser.socket.on("playerMoveFromClient", (data) => {
                opponentPlayer.socket.emit("playerMoveFromServer", {
                    ...data,
                })
            })

            opponentPlayer.socket.on("playerMoveFromClient", (data) => {
                currentUser.socket.emit("playerMoveFromServer", {
                    ...data,
                })
            })
        } else {
            currentUser.socket.emit("OpponentNotFound");
        }
    })

    socket.on("disconnect", () => {
        const currentUser = allUsers[socket.id];
        currentUser.online = false;
        currentUser.playing = false;

        for (let index = 0; index < allRooms.length; index++) {
            const { player1, player2 } = allRooms[index];
            if (player1.socket.id === socket.id) {
                player2.socket.emit("opponentLeftMatch");
                break;
            }
            if (player2.socket.id === socket.id) {
                player1.socket.emit("opponentLeftMatch");
                break;
            }
        }
    })
});

// Start the Express server and WebSocket server on port 3000
httpServer.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
