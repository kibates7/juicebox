const express = require('express');
const tagsRouter = express.Router();

tagsRouter.use((req, res, next) => {
    console.log("getting all tags...");
    next();
})

const { getAllTags } = require('../db')

tagsRouter.get('/', async (reqq, res) => {
    const tags = await getAllTags()

    res.send({
        tags
    })
})

module.exports = tagsRouter