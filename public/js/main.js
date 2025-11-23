document.addEventListener("DOMContentLoaded", () => {
  // Ensure mobile inline playback behavior
  const ensureInlineVideoAttributes = () => {
    document.querySelectorAll("video").forEach((v) => {
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
    });
  };

  const safePlay = async (video) => {
    if (!video) return;
    try {
      if (video.paused) await video.play();
    } catch (e) {
      const resume = () => {
        video.play().catch(() => {});
        document.removeEventListener("touchend", resume);
        document.removeEventListener("click", resume);
      };
      document.addEventListener("touchend", resume, { once: true });
      document.addEventListener("click", resume, { once: true });
    }
  };

  const attachStream = async (videoEl, stream, mute = false) => {
    if (!videoEl) return;
    if (mute) videoEl.muted = true;
    videoEl.srcObject = stream;
    await safePlay(videoEl);
  };

  const getMobileConstraints = (facing = "user") => ({
    audio: true,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
      frameRate: { ideal: 24, max: 30 },
    },
  });

  ensureInlineVideoAttributes();
  const createUserBtn = document.getElementById("create-user");
  const username = document.getElementById("username");
  const allusersHtml = document.getElementById("allusers");
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const callControls = document.getElementById("call-controls");
  const endCallBtn = document.getElementById("end-call-btn");
  const micBtn = document.getElementById("mute-mic-btn");
  const camBtn = document.getElementById("disable-cam-btn");

  // Ringing UI
  const ringingScreen = document.getElementById("ringing-screen");
  const callerNameEl = document.getElementById("caller-name");
  const acceptBtn = document.getElementById("accept-call");
  const rejectBtn = document.getElementById("reject-call");
  const ringtone = document.getElementById("ringtone");

  // Call status UI
  const callStatus = document.getElementById("call-status");

  const socket = io();
  let localStream;
  let caller = [];

  // 🔓 Unlock audio on first click (once)
  const unlockAudio = () => {
    ringtone.muted = false;
    document.body.removeEventListener("click", unlockAudio);
  };
  document.body.addEventListener("click", unlockAudio);

  // ========== Init Video ==========
  async function startMyVideo() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia(getMobileConstraints("user"));
      await attachStream(localVideo, localStream, true);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }
  startMyVideo();

  // ========== PeerConnection Singleton ==========
  const PeerConnection = (function () {
    let peerConnection;
    const createPeerConnection = () => {
      const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
      peerConnection = new RTCPeerConnection(config);

      if (localStream) {
        localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
      }

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          attachStream(remoteVideo, event.streams[0]);
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("icecandidate", event.candidate);
        }
      };

      const pc = PeerConnection.getInstance();
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        endCall("Call disconnected due to network issue", "error");
      }

      return peerConnection;
    };

    return {
      getInstance: () => {
        if (!peerConnection || peerConnection.connectionState === "closed" || peerConnection.connectionState === "failed") {
          peerConnection = createPeerConnection();
        }
        return peerConnection;
      },
      closeConnection: () => {
        if (peerConnection) {
          peerConnection.close();
          peerConnection = null;
        }
      },
    };
  })();

  // ========== User Join ==========
  createUserBtn.addEventListener("click", () => {
    if (username.value !== "") {
      socket.emit("join-user", username.value);
      document.querySelector(".username-input").style.display = "none";
    }
  });

  // ========== End Call ==========
  endCallBtn.addEventListener("click", () => {
    if (caller.length > 0) {
      socket.emit("call-ended", caller);
      endCall("You ended the call");
    }
  });

  // ========== Users List ==========
  socket.on("joined", (allusers) => {
    allusersHtml.innerHTML = "";
    for (const user in allusers) {
      const li = document.createElement("li");
      li.textContent = `${user} ${user === username.value ? "(You)" : ""}`;
      if (user !== username.value) {
        const button = document.createElement("button");
        button.classList.add("call-btn");
        button.addEventListener("click", () => startCall(user));
        const img = document.createElement("img");
        img.setAttribute("src", "/images/phone.png");
        img.setAttribute("width", 20);
        button.appendChild(img);
        li.appendChild(button);
      }
      allusersHtml.appendChild(li);
    }
  });

  // ========== Start Call ==========
  async function startCall(targetUser) {
    const pc = PeerConnection.getInstance();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { from: username.value, to: targetUser, offer });
    caller = [username.value, targetUser];
  }

  // ========== Incoming Call ==========
  socket.on("auth-request", ({ from }) => {
    callerNameEl.textContent = `${from} is calling... 📞`;
    ringingScreen.classList.remove("hidden");
    ringtone.play().catch(err => console.warn("Ringtone play blocked:", err));

    acceptBtn.onclick = () => {
      ringtone.pause();
      ringingScreen.classList.add("hidden");
      socket.emit("auth-ack", { from, to: username.value, accepted: true });
      callControls.classList.add("active");
    };

    rejectBtn.onclick = () => {
      ringtone.pause();
      ringingScreen.classList.add("hidden");
      socket.emit("auth-ack", { from, to: username.value, accepted: false });
      endCall(`${from} rejected your call`);
    };
  });

  // ========== Handle Offer ==========
  socket.on("offer", async ({ from, to, offer }) => {
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { from, to, answer: pc.localDescription });
    caller = [from, to];
  });

  // ========== Handle Answer ==========
  socket.on("answer", async ({ from, to, answer }) => {
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(answer);
    callControls.classList.add("active");
    caller = [from, to];
  });

  // ========== Handle Call Rejected ==========
  socket.on("call-rejected", ({ to }) => {
    endCall(`${to} rejected your call`, "warning");
  });

  // ========== ICE ==========
  socket.on("icecandidate", async (candidate) => {
    const pc = PeerConnection.getInstance();
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  });

  // ========== Call End ==========
  socket.on("call-ended", () => {
    endCall("Call ended by other user", "info");
  });

  // ========== End Call Function ==========
  function endCall(message = "Call disconnected", type = "error") {
    PeerConnection.closeConnection();
    callControls.classList.remove("active");
    remoteVideo.srcObject = null;
    ringtone.pause();
    ringingScreen.classList.add("hidden");
    caller = [];

    callStatus.textContent = message;
    callStatus.className = "";
    callStatus.id = "call-status";
    callStatus.classList.add("show", type);

    setTimeout(() => {
      callStatus.classList.remove("show");
    }, 4000);
  }

  // ========== Toggle Mic ==========
  micBtn.addEventListener("click", () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const isOn = audioTrack.enabled;
      micBtn.querySelector("img, svg").style.display = "block";
      micBtn.setAttribute("aria-pressed", isOn);
      micBtn.setAttribute("aria-label", isOn ? "Mute microphone" : "Unmute microphone");
      micBtn.title = isOn ? "Mute microphone" : "Unmute microphone";
      micBtn.classList.toggle("off", !isOn);
      micBtn.classList.toggle("active", isOn);
    }
  });

  // ========== Toggle Cam ==========
  camBtn.addEventListener("click", () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const isOn = videoTrack.enabled;
      camBtn.querySelector("img, svg").style.display = "block";
      camBtn.setAttribute("aria-pressed", isOn);
      camBtn.setAttribute("aria-label", isOn ? "Turn off camera" : "Turn on camera");
      camBtn.title = isOn ? "Turn off camera" : "Turn on camera";
      camBtn.classList.toggle("off", !isOn);
      camBtn.classList.toggle("active", isOn);
    }
  });
});
