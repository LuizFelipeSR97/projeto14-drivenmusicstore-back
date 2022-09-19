import axios from 'axios';
import cors from "cors";
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

const server = express();

server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("drivenmusicstore");
});

// Modelos e Schemas

// Usuarios cadastrados:

/* const users = {
    name: "Fulano",
    email: "fulano@a.com",
    password: "aaa",
    ~_id: ???????
} */

const userSchema = joi.object({
    name: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().required()
})

//

// Route Users

server.get("/users", async (req,res) =>{

    try{
        const users = await db.collection("users").find().toArray()
        res.send(users)

    } catch(error) {
        res.status(500).send(error.message)
    }
});

server.post("/users", async (req,res) => {

    const user = {name: req.body.name, email: req.body.email, password: bcrypt.hashSync(req.body.password, 10)}

    const validation = userSchema.validate(user, { abortEarly: false 
    });

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        res.status(422).send(errors);
        return;
    }
    
    try {

        const userExists = await db.collection('users').findOne({email: user.email});

        if (userExists) {
            res.sendStatus(409)
            return
        }

        await db.collection("users").insertOne(user);
        res.sendStatus(201)

    } catch (error) {
        res.status(500).send(error.message)
    }
});  

// Route Sessions

server.get("/sessions", async (req,res) =>{

    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.sendStatus(400);
      }

    try{

        const session = await db.collection("sessions").findOne({token})

        if (!session){
            return res.sendStatus(401);
        }

        const userInfo = await db.collection("users").findOne({_id: session.userId})

        const user = {id: userInfo._id, name: userInfo.name, email: userInfo.email}

        res.send(user)

    } catch(error) {
        res.status(500).send(error.message)
    }
});

server.post("/sessions", async (req,res) => {

    const { email, password } = req.body;

    try {
    
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            res.sendStatus(401)
            //"E-mail ou password incorretos. Tente novamente."
            return
        }

		const passwordIsValid = bcrypt.compareSync(password, user.password)

        if (!passwordIsValid){
            res.sendStatus(401)
            //"E-mail ou password incorretos. Tente novamente."
            return
        }

        const token = uuid();

        await db.collection("sessions").insertOne({
            userId: user._id,
            token
        })

        res.send({id: user._id, name: user.name, email:user.email, token})

    } catch (error) {
        res.status(500).send(error.message)
    }
});  

server.delete("/sessions", async (req,res) =>{

    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.sendStatus(400);
      }

    try{

        await db.collection("sessions").deleteOne({token})

        res.sendStatus(200)

    } catch(error) {
        res.status(500).send(error.message)
    }
});

// Route Products

/* server.get("/products", async (req,res) =>{

    //Body: {type: instruments}

    try{

        const type = req.body.type;

        const produtos = await db.collection("products").find({type: type}).toArray()

        res.send(produtos)

    } catch(error) {
        res.status(500).send(error.message)
    }

}); */

server.get("/products", async (req,res) =>{

    try{

        const produtos = await db.collection("products").find().toArray()
        res.send(produtos)

    } catch(error) {
        res.status(500).send(error.message)
    }

});

server.post("/products", async (req,res) => {

    const product = req.body;

    try {
    
        const sameProduct = await db.collection('products').findOne({ name: product.name });

        if (sameProduct) {
            res.send("Esse produto já existe.")
            return
        }

        await db.collection("products").insertOne(product)

        res.send(product)

    } catch (error) {
        res.status(500).send(error.message)
    }
}); 

server.listen(process.env.MONGO_PORT);