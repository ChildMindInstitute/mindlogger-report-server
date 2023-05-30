# mindlogger-report-server
Server for MindLogger PDF reports

## Requirements
- Node >= 16

## Installation

### Install dependencies
```
npm install
```
fontconfig
```
sudo apt-get install libfontconfig
sudo yum install fontconfig
```

### Configure environment variables and folders
```
cp env.example .env
mkdir keys
mkdir outputs
```

### Generate keys and create database
```
cd keys
openssl genpkey -algorithm rsa -pkeyopt rsa_keygen_bits:4096 -out private.pem
openssl rsa -in private.pem -pubout -out public
sqlite3 passwords "VACUUM;"
```
After running those commands you will have 3 files:
```
ls
passwords  private.pem	public
```
The server public key will be in keys/public

### Start the app
```
npm run start
```
open http://localhost:3000

## Docker instruction

### Build the image first
```
docker build -t mindlogger-report-server:latest -f ./Dockerfile .
```

### Run the image
This requires Generating keys and creating database in keys folder.
```
docker run -d \
-e "BACKEND_SERVER=https://api.mindlogger.org/api/v1" \
-v "./keys:/app/keys" \
-p "3000:3000" \
--name mindlogger-report-server \
mindlogger-report-server:latest
```
