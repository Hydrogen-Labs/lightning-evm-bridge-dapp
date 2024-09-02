# Troubleshooting Guide

This document is designed to help you troubleshoot common issues when setting up Docker for this project. Follow the steps below to ensure your environment is properly configured.

## Table of Contents

- [1. Rebuilding and Recreating Containers](#1-rebuilding-and-recreating-containers)
- [2. Clearing Docker Cache](#2-clearing-docker-cache)
- [3. Removing Docker Volumes](#3-removing-docker-volumes)
- [4. Checking Container Connectivity](#4-checking-container-connectivity)
- [5. Ensuring Containers are Connected to the Lightning Polar Network](#5-ensuring-containers-are-connected-to-the-bridge-network)
- [6. Other Common Issues](#6-other-common-issues)

---

## 1. Rebuilding and Recreating Containers

If you encounter issues during the development process, try rebuilding and recreating your Docker containers.

1. **Rebuild the Containers Without Using Cache**:

   ```bash
   docker compose build --no-cache
   ```

2. **Recreate and Rebuild Containers**:
   Use this command to force Docker to recreate containers, which can solve issues caused by container states.

   ```bash
   docker compose up --build --force-recreate
   ```

3. **Bring Up Containers After Rebuild**:
   If you just want to bring up the containers after a rebuild:
   ```bash
   docker compose up --build
   ```

## 2. Clearing Docker Cache

Clearing Docker's build cache can help solve issues related to outdated or corrupted data.

1. **Clear Docker Build Cache**:
   ```bash
   docker builder prune --all
   ```
   This will remove all unused build cache.

## 3. Removing Docker Volumes

Sometimes, volume issues can cause containers to behave unexpectedly. Removing and recreating the volumes might resolve these issues.

1. **List Docker Volumes**:

   ```bash
   docker volume ls
   ```

2. **Remove a Specific Volume**:

   ```bash
   docker volume rm <volume_name>
   ```

3. **Remove All Unused Volumes**:
   ```bash
   docker volume prune -f
   ```

> **Warning**: Removing volumes will also remove the data stored in those volumes. Ensure you have backups if necessary.

## 4. Checking Container Connectivity

If containers are not communicating properly, ensure they are on the same network and can reach each other. For your setup, ensure that both the `polar` network containers and the `lightning-evm-bridge-dapp` containers are properly connected.

1. **Check if the Containers are on the Same Network**:

   ```bash
   docker network inspect bridge-network
   OR
   docker network ls
   ```

   If the custom network is not listed, create it manually:

   ```bash
   docker network create bridge-network
   ```

   Look under the `Containers` section to ensure all relevant containers are listed. If they are not listed, it means they are not connected to the `bridge-network` network.

2. **Connect `lightning-evm-bridge-dapp` Containers to the Bridge Network**:
   If you find that `lightning-evm-bridge-dapp` containers are not connected to the `bridge-network` network, connect them manually:

   ```bash
   docker network connect bridge-network lightning-evm-bridge-dapp-webapp-1
   docker network connect bridge-network lightning-evm-bridge-dapp-server-1
   docker network connect bridge-network lightning-evm-bridge-dapp-prisma-1
   ```

3. **Connect `polar` Network Containers to the Bridge Network**:
   Similarly, if `polar` containers are not connected, you can manually connect them:

   ```bash
   docker network connect bridge-network polar-n1-alice
   ```

4. **Connect `relay-server` Containers to the Bridge Network**:
   If you find that `relay-server` containers are not connected to the `bridge-network` network, connect them manually:

   ```bash
   docker network connect bridge-network relay-server-relay-server-1
   ```

5. **Ping Between Containers**:
   Exec into one container and ping another container to test connectivity. For example:
   ```bash
   docker exec -it lightning-evm-bridge-dapp-webapp-1 ping polar-n1-alice
   docker exec -it lightning-evm-bridge-dapp-webapp-1 ping relay-server-relay-server-1
   ```

## 5. Other Common Issues

### Container Fails to Start

- **Check logs**:

  ```bash
  docker logs lightning-evm-bridge-dapp-prisma-1
  docker logs lightning-evm-bridge-dapp-server-1
  docker logs lightning-evm-bridge-dapp-webapp-1
  ```

  or

  ```bash
  docker logs polar-n1-alice
  ```

  or

  ```bash
  docker logs relay-server-relay-server-1
  ```

Examine the logs for any error messages.

- **Port Conflicts**:
  Ensure that the ports required by your containers are not in use by other services.

### Dependency Issues

- **Ensure all required services are running**:
  Make sure all dependent services (e.g., databases, message brokers) are up and running before starting your container.

---

If you've followed these steps and are still experiencing issues, feel free to reach out for further support.
