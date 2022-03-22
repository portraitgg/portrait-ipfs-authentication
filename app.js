require('dotenv').config()

const express = require("express");
const app = express();

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const maxSize = process.env.MAX_SIZE;

const { create } = require('ipfs-http-client');
const ipfsHost = process.env.IPFS_HOST

MongoClient = require('mongodb').MongoClient;
const dbUrl = process.env.DB_AUTH;
const dbName = process.env.DB_NAME;
const dbClient = new MongoClient(dbUrl);
const dbConnect = dbClient.connect();


app.post("/", upload.single("data"), async function (req, res) {
    const accessToken = req.headers['access-token'];
    const ethAddress = req.headers['eth-address'];

    // Check if authentication is valid in the database
    const AuthValid = await dbConnect.then(() => {
        const db = dbClient.db(dbName)

        return db
            .collection(process.env.DB_COLLECTION)
            .findOne({ ethAddress, accessToken })
            .then((result) => !!result)
    })

    // Checking for missing fields or invalid authentication with AuthValid. If there are no missing fields and AuthValid is true, then the file is uploaded to IPFS.
    if (!req.file) {
        return res.status(400).json({ status: 400, message: 'Missing file' });
    }
    
    if (req.file.size > maxSize) {
        return res.status(400).json({ status: 400, message: 'File too large' });
    }

    if (req.file.mimetype !== 'image/jpeg' && req.file.mimetype !== 'image/png' && req.file.mimetype !== 'image/gif') {
        return res.status(400).json({ status: 400, message: 'Invalid file type' });
    }

    if (!accessToken) {
        return res.status(400).json({ status: 400, message: 'Missing access token' });
    }

    if (!ethAddress) {
        return res.status(400).json({ status: 400, message: 'Missing eth address' });
    }

    if (!AuthValid) {
        return res.status(401).json({ status: 401, message: 'Invalid user authentication' });
    }

    try {
        console.log(req.file.mimetype)
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

});

const port = process.env.PORT || 1390

app.listen(port, () => {
    console.log(`Security authentication layer listening on port ${port}`);
});