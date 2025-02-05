# mindlogger-report-server

Server for MindLogger PDF reports

## Requirements

- Node >= 20

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

| Key            | Default value | Description                                                                                             |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| PORT           | 3000          | Port server will listen to requests                                                                     |
| KEYS_FOLDER    | keys          | Folder in local storage with keys                                                                       |
| OUTPUTS_FOLDER | os.tmpdir()   | Folder in local storage to temporary store generated PDF                                                |
| BUILD_VERSION  | null          | Version of report server                                                                                |
| AWS_KMS_KEY_ID | null          | AWS KMS Key id used to crypt applet password in database, if null password will be stored as plain text |
| AWS_REGION     | us-east-1     | AWS region of KMS Key                                                                                   |

### AWS KMS

The report server utilizes an AWS KMS key to encrypt and decrypt applet passwords in the database. If the AWS_KMS_KEY_ID environment variable is missing, this feature will be disabled.

Additionally, backward compatibility with existing plaintext passwords is maintained, so only new applet passwords will be encrypted. To ensure this compatibility, all encrypted passwords stored in the database will be prefixed with 'ENC\_'.

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
-v "./keys:/app/keys" \
-p "3000:3000" \
--name mindlogger-report-server \
mindlogger-report-server:latest
```
