const express = require('express');
const postsRouter = express.Router();

postsRouter.use((req, res, next) => {
    console.log("getting all posts...");
    next();
})

const {getAllPosts} = require('../db')

postsRouter.get('/', async (req, res) => {
    const posts = await getAllPosts();

    res.send({
        posts
    })
})

module.exports = postsRouter