import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const server = createServer(app);
const io = new Server(server);

const allusers = {};

// System path setup
const __dirname = dirname(fileURLToPath(import.meta.url));

// Exposing the public directory
app.use(express.static(join(__dirname, "public")));

// Serve the sign-in page
app.get("/", (req, res) => {
    console.log("GET Request /");
    res.sendFile(join(__dirname, "app", "sign.html"));
});

// Serve the index page
app.get("/index", (req, res) => {
    console.log("GET Request /index");
    res.sendFile(join(__dirname, "app", "index.html"));
});

// Handle socket connections
io.on("connection", (socket) => {
    console.log(`Someone connected: ${socket.id}`);

    // User joins
    socket.on("join-user", username => {
        console.log(`${username} joined`);
        allusers[username] = { username, id: socket.id };
        io.emit("joined", allusers);
    });

    // Caller starts an offer -> send auth-request first
    socket.on("offer", ({ from, to, offer }) => {
        if (allusers[to]) {
            allusers[from].pendingOffer = offer; // store temporarily
            io.to(allusers[to].id).emit("auth-request", { from });
        }
    });

    // Callee accepts/rejects
    socket.on("auth-ack", ({ from, to, accepted }) => {
        if (accepted) {
            const offer = allusers[from]?.pendingOffer;
            if (offer) {
                io.to(allusers[to].id).emit("offer", { from, to, offer });
            }
        } else {
            io.to(allusers[from].id).emit("call-rejected", { from, to });
        }
    });

    // Answer
    socket.on("answer", ({ from, to, answer }) => {
        if (allusers[from]) {
            io.to(allusers[from].id).emit("answer", { from, to, answer });
        }
    });

    // End Call
    socket.on("end-call", ({ from, to }) => {
        if (allusers[to]) {
            io.to(allusers[to].id).emit("end-call", { from, to });
        }
    });

    socket.on("call-ended", caller => {
        const [from, to] = caller;
        if (allusers[from]) io.to(allusers[from].id).emit("call-ended", caller);
        if (allusers[to]) io.to(allusers[to].id).emit("call-ended", caller);
    });

    // ICE Candidates
    socket.on("icecandidate", candidate => {
        socket.broadcast.emit("icecandidate", candidate);
    });

    // Disconnect cleanup
    socket.on("disconnect", () => {
        for (let user in allusers) {
            if (allusers[user].id === socket.id) {
                delete allusers[user];
                break;
            }
        }
        io.emit("joined", allusers);
    });
});

// Use process.env.PORT for Render or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));