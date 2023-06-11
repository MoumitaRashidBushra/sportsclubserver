const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')(process.env.SECRET_KEY)
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


//console.log(process.env.DB_PASS)


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized Access' });
    }

    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'Unauthorized Access' })
        }
        req.decoded = decoded;
        next();
    })
}




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
        const classesCollection = client.db("sportsclub").collection("classes");
        const selectClassesCollection = client.db("sportsclub").collection("selectClasses");
        const paymentCollection = client.db("sportsclub").collection("payment");


        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' })

            res.send({ token })
        })

        //admin verify

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        //Instructor verify

        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        //Student verify

        const verifyStudent = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'student') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }


        //user insert database
        app.post('/users', async (req, res) => {
            const user = req.body;
            user.role = 'student';


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



        // app.get('/users/admin/:email',  async (req, res) => {
        //     const email = req.params.email;


        //     const query = { email: email }
        //     const user = await usersCollection.findOne(query);
        //     const result = { admin: user?.role === 'admin' }
        //     res.send(result);
        //   })


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email }
            const user = await usersCollection.findOne(query);

            if (user.role === 'admin') {
                res.send({ roles: "admin" });
            }
            else if (user.role === 'instructor') {
                res.send({ roles: "instructor" });
            }
            else {
                res.send({ roles: "student" });
            }

        })
        //show instructor
        app.get('/instructor', async (req, res) => {
            const email = req.params.email;
            const query = { role: 'instructor' }
            const result = await usersCollection.find(query).toArray();
            res.send(result);


        })


        //show instructor in home page
        app.get('/home', async (req, res) => {
            const email = req.params.email;
            const query = { role: 'instructor' }
            const result = await usersCollection.find(query).limit(6).toArray();
            res.send(result);


        })




        //classes Collection

        //add instructor classes in database

        app.post('/classes', async (req, res) => {
            const newItem = req.body;
            const result = await classesCollection.insertOne(newItem)
            res.send(result);
        })

        //manage all class

        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        })




        // popular class
        app.get('/showpopularclasses', async (req, res) => {
            const email = req.params.email;
            const query = { status: 'Approved' }
            const result = await classesCollection.find(query).sort({ enrolled: -1 }).limit(6).toArray();
            res.send(result);


        })



        //show classes page in approved class

        app.get('/showclasses', async (req, res) => {
            const email = req.params.email;
            const query = { status: 'Approved' }
            const result = await classesCollection.find(query).toArray();
            res.send(result);


        })

        //admin approved the class

        app.patch('/approved/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateStatus = {
                $set: {
                    status: 'Approved'
                },
            };

            const result = await classesCollection.updateOne(filter, updateStatus);
            res.send(result);

        })


        //admin deny the class

        app.patch('/deny/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateStatus = {
                $set: {
                    status: 'Deny'
                },
            };

            const result = await classesCollection.updateOne(filter, updateStatus);
            res.send(result);

        })

        //feedback

        app.get('/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.findOne(query);
            res.send(result);

        })

        //update the feedback

        app.patch('/updatefeedback/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateFeedback = req.body;
            const updateStatus = {
                $set: {
                    feedback: updateFeedback.feedback
                },
            };

            const result = await classesCollection.updateOne(filter, updateStatus);
            res.send(result);

        })


        //Myclass in instructors

        app.get('/myclass/:email', async (req, res) => {
            //verifyJWT,

            const email = req.params.email;
            console.log(email)
            const query = {
                instructorEmail: email
            }

            const result = await classesCollection.find(query).toArray();
            res.send(result);
        });




        //selected class collection 

        //add database in selected class

        app.post('/select', async (req, res) => {
            const newItem = req.body;
            const result = await selectClassesCollection.insertOne(newItem)
            res.send(result);
        })

        //show my selected class


        app.get('/select/:email', async (req, res) => {
            //verifyJWT,

            const email = req.params.email;
            console.log(email)
            const query = {
                usermail: email
            }

            const result = await selectClassesCollection.find(query).toArray();
            res.send(result);
        });

        //delete my selected class 
        app.delete('/select/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectClassesCollection.deleteOne(query);
            res.send(result);
        })

        //payment
        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectClassesCollection.findOne(query);
            res.send(result);

        })



        // create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            //verifyJWT, 
            const { total } = req.body;
            const amount = parseInt(total * 100);
            console.log(total, amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        app.post('/payments', async (req, res) => {
            //verifyJWT,
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const query = {
                _id: new ObjectId(payment.selectedId)
            };

            const filter = {
                _id: new ObjectId(payment.classId)
            };


            const updateDoc = {
                $inc: {
                    availableSeats: -1,
                    enrolled: 1
                }
            };

            const updateStatus = await classesCollection.updateOne(filter, updateDoc);
            const deletedResult = await selectClassesCollection.deleteOne(query);



            res.send({ insertResult, updateStatus, deletedResult });
        })




        //payment history

        app.get('/payments/:email', async (req, res) => {
            //verifyJWT,

            const email = req.params.email;

            const query = {
                email: email
            }

            const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
            res.send(result);
        });


        //enrollClassess

        app.get('/enrolled/:email', async (req, res) => {
            //verifyJWT,

            const email = req.params.email;

            const query = { email: email }

            const paymentData = await paymentCollection.find(query).toArray();
            const classes = await classesCollection.find({
                _id: {
                    $in: paymentData.map(id => new ObjectId(id.classId))
                }
            }).toArray();
            res.send(classes);
        });





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