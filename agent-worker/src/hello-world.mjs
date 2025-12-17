import http from "http";

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/html" });
	res.end("<h1>Hello World, This is your survey!</h1>");
});

server.listen(PORT, "0.0.0.0", () => {
	console.log(`Server running at http://0.0.0.0:${PORT}`);
});
