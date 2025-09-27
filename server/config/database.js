const mongoose = require("mongoose");

// Function to connect to the mongodb database
const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log('Database Connected'));
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
        const dbName = process.env.MONGODB_DB || 'poll-app';
        await mongoose.connect(`${uri}/${dbName}`);
    } catch (error) {
        console.log(error);
    }
};

module.exports = connectDB;