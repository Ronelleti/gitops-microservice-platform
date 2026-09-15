from flask import Flask, jsonify
import os
import socket

app = Flask(__name__)

APP_VERSION = os.getenv("APP_VERSION", "0.1.0")


@app.route("/")
def index():
    return jsonify({
        "message": "Hello from the GitOps microservice platform",
        "version": APP_VERSION,
        "hostname": socket.gethostname(),
    })


@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok"}), 200


@app.route("/readyz")
def readyz():
    return jsonify({"status": "ready"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
