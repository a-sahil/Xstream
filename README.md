# Xstream: Your AI-Powered Web3 Companion for Social Media


**Xstream** is a comprehensive platform that seamlessly integrates **Aptos blockchain functionality** directly into your social media experience.  
It combines a **Node.js backend**, a **React dashboard**, and an **intuitive Chrome extension** to allow users to perform Web3 actions using **natural language commands** right from **X (formerly Twitter).**

---

## 🚀 Core Features

- **AI-Powered Command Processing**  
  Use natural language on X.com to check your balance, send tokens, swap assets, and create donation templates.  

- **On-the-Fly Wallet Generation**  
  New users automatically get a secure Aptos wallet generated and stored for them.  

- **Interactive Web Dashboard**  
  A rich frontend application to view your wallet balance, transaction history, and manage your Web3 social identity.  

- **In-Context Chrome Extension**  
  Select text on X.com, right-click, and execute blockchain commands without leaving your feed.  

- **Decentralized Donation Templates**  
  Generate dynamic, embeddable donation widgets hosted on **IPFS via Pinata**.  

- **Token Swaps**  
  Integrated with **PanoraSwap** via the **Move Agent Kit** for easy asset swapping.

---

## 📂 Project Structure

The project is divided into three main parts:

- **/backend** → An Express.js server handling authentication, wallet management, command processing, and interaction with Aptos blockchain + IPFS.  
- **/frontend** → A modern React dashboard built with Vite, TypeScript, and shadcn/ui for a polished user experience.  
- **/extension** → A Chrome extension that injects Xstream’s Web3 functionality directly into X.com’s UI.  

---

## 🛠 Tech Stack

| Component   | Technology |
|-------------|------------|
| **Backend** | Node.js, Express, MongoDB, Mongoose, Aptos TS SDK, Move Agent Kit, Pinata (IPFS), Dotenv, Axios |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Recharts, Axios |
| **Extension** | Chrome Extension API (Manifest V3), JavaScript |

---

## ⚡ Getting Started

Follow these steps to set up the project locally for development and testing.

### ✅ Prerequisites
- [Node.js](https://nodejs.org/) v18.0 or higher  
- npm or Yarn (package manager)  
- [MongoDB](https://www.mongodb.com/) (local instance or MongoDB Atlas)  
- [Google Chrome](https://www.google.com/chrome/) (for extension testing)  

---

## 🔧 Installation & Setup

### 1. Clone the Repository
```sh
git clone https://github.com/your-username/xstream.git
cd xstream

cd backend
npm install


cp .env.example .env

# Server Configuration
PORT=8000

# MongoDB Connection
MONGO_URI=your_mongodb_connection_string

# Pinata (IPFS)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt

# Panora (Move Agent Kit Swaps)
PANORA_API_KEY=your_panora_api_key


node index.js

cd frontend
npm install
npm run dev


---


