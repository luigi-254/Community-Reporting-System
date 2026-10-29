import net from "node:net";

const applications = [
  { name: "backend", port: 5000 },
  { name: "citizen-frontend", port: 3000 },
  { name: "admin-dashboard", port: 3001 },
  { name: "government-frontend", port: 3002 },
];

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRNOTAVAIL" || error.code === "EAFNOSUPPORT") {
        resolve({ free: true });
        return;
      }

      resolve({ free: false, code: error.code ?? "UNKNOWN" });
    });

    server.once("listening", () => {
      server.close(() => resolve({ free: true }));
    });

    server.listen({ port, host, exclusive: true });
  });
}

async function checkPort(port) {
  const ipv4 = await canListen(port, "0.0.0.0");

  if (!ipv4.free) {
    return ipv4;
  }

  return canListen(port, "::");
}

let hasConflict = false;

console.log("Checking required development ports...");

for (const application of applications) {
  const result = await checkPort(application.port);

  if (result.free) {
    console.log(`  OK   ${application.port} (${application.name})`);
  } else {
    hasConflict = true;
    console.error(
      `  BUSY ${application.port} (${application.name}) - port is already in use (${result.code})`,
    );
  }
}

if (hasConflict) {
  console.error("");
  console.error("Port conflict detected. Stop the process using the port(s) above and retry.");
  console.error("No application configuration or port assignment was changed.");
  process.exitCode = 1;
} else {
  console.log("All required development ports are available.");
}
