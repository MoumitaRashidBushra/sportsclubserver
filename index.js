const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


console.log(process.env.DB_PASS)




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.idh7yj4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const usersCollection = client.db("sportsclub").collection("users");


        //user insert database
        app.post('/users', async (req, res) => {
            const user = req.body;


            const query = { email: user.email }
            const existsUser = await usersCollection.findOne(query);

            if (existsUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        //get all user for manage all user 
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        //make Admin
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateAdmin = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await usersCollection.updateOne(filter, updateAdmin);
            res.send(result);

        });

        //Make instructor
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateInstructor = {
                $set: {
                    role: 'instructor'
                },
            };

            const result = await usersCollection.updateOne(filter, updateInstructor);
            res.send(result);

        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Sports Club is Running')
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})