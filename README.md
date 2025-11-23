# Decentralized Video Calling App

A decentralized, peer-to-peer video calling application built with Node.js, Express, and Socket.IO. This project enables real-time video communication without relying on centralized servers for media relay, ensuring privacy and low latency.

---

## 🚀 Features

- **Peer-to-peer video calls** using WebRTC
- **Real-time signaling** with Socket.IO
- **User authentication** (basic username join)
- **Simple, intuitive UI**
- **No central media server**—direct browser-to-browser communication

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** HTML, CSS, JavaScript, WebRTC
- **Deployment:** Render (or any Node.js hosting with WebSocket support)

---

## 📦 Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/V-Varadharajan/Decentralized-Video-Calling-App.git
   cd Decentralized-Video-Calling-App
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Run the server:**
   ```sh
   npm start
   ```
   The server will start on [http://localhost:3000](http://localhost:3000) by default.

---

## 🌐 Usage

1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Enter a username to join.
3. See the list of online users and initiate a video call with any user.

---

## 📝 Project Structure

```
.
├── app/
│   ├── sign.html
│   └── index.html
├── public/
│   └── ... (static assets)
├── server.js
├── package.json
└── README.md
```

---

## 🚩 Deployment

You can deploy this app to [Render](https://render.com/), [Railway](https://railway.app/), [Glitch](https://glitch.com/), or any Node.js hosting that supports WebSockets.

**Render Example:**
- Connect your GitHub repo to Render.
- Set the start command to `npm start`.
- The app will be live at your Render-provided URL.

---

## 🤝 Contributing

Contributions are welcome!  
Feel free to open issues or submit pull requests.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙋‍♂️ Author

- [Bala R]
