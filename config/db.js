const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB Connected");

        const db = mongoose.connection.db;
        const collections = await db.listCollections({ name: 'users' }).toArray();
        if (collections.length > 0) {
            try {
                await db.collection('users').dropIndex('email_1');
                console.log("🗑️ Old index dropped");
            } catch (err) {
                
            }
        }
    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
};

module.exports = connectDB;