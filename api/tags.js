const express = require('express');
const tagsRouter = express.Router();

tagsRouter.use((req, res, next) => {
    console.log("getting all tags...");
    next();
})

const { getAllTags, getPostsByTagName } = require('../db')

tagsRouter.get('/', async (req, res) => {
    const tags = await getAllTags()

    res.send({
        tags
    })
})

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
    const { tagName } = req.params
      
    try {
      const posts = await getPostsByTagName(tagName)
      //console.log("posts: ", posts)
      if(posts.length){
          res.send({posts: posts})
      }
      else{
          next({
              name: 'PostError',
              message: 'No posts for this tag'
          });
      }
      } catch ({ name, message }) {
      next({ name, message });
    }
  })

module.exports = tagsRouter