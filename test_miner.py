import socket, json, uuid

USER = "testcheck"
PASS = "StrongPass123"

sock = socket.socket()
sock.connect(("127.0.0.1", 3333))

def send(msg):
    data = (json.dumps(msg) + "\n").encode()
    sock.sendall(data)

def recv():
    return json.loads(sock.recv(4096).decode().strip().split("\n")[-1])

# 1. Subscribe
send({"id": 1, "method": "mining.subscribe", "params": ["cpuminer/1.0", USER]})
print("Subscribe:", recv())

# 2. Authorize
send({"id": 2, "method": "mining.authorize", "params": [USER, PASS]})
print("Auth:", recv())

# 3. Submit a few fake shares
for i in range(3):
    share_id = str(uuid.uuid4())
    send({"id": 3, "method": "mining.submit",
          "params": [USER, share_id, "00000000", "00000000", "00000000"]})
    try:
        resp = recv()
        status = "ACCEPTED" if resp.get("result") else "REJECTED"
        print(f"Share {i}: {status}")
    except Exception as e:
        print(f"Share {i}: error ({e})")

sock.close()
