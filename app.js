require('dotenv').config()

const express = require("express");
const app = express();

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const { create } = require('ipfs-http-client');
const ipfsHost = `${process.env.IPFS_HOST}`

MongoClient = require('mongodb').MongoClient;
const dbUrl = `${process.env.DB_AUTH}`;
const dbName = `${process.env.DB_NAME}`;
const dbClient = new MongoClient(dbUrl);
const dbConnect = dbClient.connect();

app.post("/", upload.single("data"), async function (req, res) {
    const accessToken = req.headers['access-token'];
    const ethAddress = req.headers['eth-address'];

    // Check if authentication is valid in the database
    const AuthValid = await dbConnect.then(() => {
        const db = dbClient.db(dbName);

        return db.collection("user").findOne({ ethAddress: ethAddress, accessToken: accessToken }).then(function (result) {
            return result ? true : false;
        });
    });

    // Checking for missing fields or invalid authentication with AuthValid. If there are no missing fields and AuthValid is true, then the file is uploaded to IPFS.
    if (!req.file) {
        return res.status(400).json({ status: 400, message: 'Missing file' });
    } else if (!accessToken) {
        return res.status(400).json({ status: 400, message: 'Missing access token' });
    } else if (!ethAddress) {
        return res.status(400).json({ status: 400, message: 'Missing eth address' });
    } else if (!AuthValid) {
        return res.status(401).json({ status: 401, message: 'Invalid user authentication' });
    } else {
        try {
            const ipfs = create({
                host: ipfsHost,
                port: '5001',
                protocol: 'http',
            });
            const file = await ipfs.add(req.file.buffer);

            return res
                .status(200)
                .json({
                    status: 200,
                    filename: req.file.originalname,
                    hash: file.path,
                    message: 'Succesfully uploaded',
                });
        } catch (e) {
            return res.status(400).json({ status: 400, message: e.message });
        }
    }
});

app.listen(process.env.PORT || 1390, () => {
    console.log(`Security authentication layer listening on port 1390`);
});
