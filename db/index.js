const { Client } = require('pg') //imports the pg module

const client = new Client(process.env.DATABASE_URL || 'postgres://localhost:5432/juicebox-dev');


async function getAllUsers(){
    const {rows} = await client.query(`
    SELECT id, username, name, location, active
    FROM users;
    `);

    return rows;
}

async function createUser({ username, password, name, location }) {
    try {
      const {rows: [user]} = await client.query(`
      INSERT INTO users(username, password, name, location) VALUES ($1, $2, $3, $4)
      ON CONFLICT(username) DO NOTHING
      RETURNING *;
    `, [ username, password, name, location ]);
  
      return user
    } catch (error) {
      throw error;
    }
  }

async function updateUser(id, fields = {}) {
    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');
      console.log(setString);
    if (setString.length === 0){
        return;
    }

    try {
       const {rows: [user]} = await client.query(`
       UPDATE users
       SET ${ setString }
       WHERE id=${ id }
       RETURNING *;
       `, Object.values(fields)) 
       
       return user;
    } catch (error) {
        throw error;
    }
}

async function createPost({
  authorId,
  title,
  content,
  tags = [] 
}) {
  try {
    const { rows: [ post ] } = await client.query(`
      INSERT INTO posts("authorId", title, content) 
      VALUES($1, $2, $3)
      RETURNING *;
    `, [authorId, title, content]);

    const tagList = await createTags(tags);

    return await addTagsToPost(post.id, tagList);
  } catch (error) {
    throw error;
  }
}



async function updatePost(postId, fields = {}) {
  // read off the tags & remove that field 
  const { tags } = fields; // might be undefined
  delete fields.tags;

  // build the set string
  const setString = Object.keys(fields).map(
    (key, index) => `"${ key }"=$${ index + 1 }`
  ).join(', ');

  try {
    // update any fields that need to be updated
    if (setString.length > 0) {
      await client.query(`
        UPDATE posts
        SET ${ setString }
        WHERE id=${ postId }
        RETURNING *;
      `, Object.values(fields));
    }

    // return early if there's no tags to update
    if (tags === undefined) {
      return await getPostById(postId);
    }

    // make any new tags that need to be made
    const tagList = await createTags(tags);
    const tagListIdString = tagList.map(
      tag => `${ tag.id }`
    ).join(', ');

    // delete any post_tags from the database which aren't in that tagList
    await client.query(`
      DELETE FROM post_tags
      WHERE "tagId"
      NOT IN (${ tagListIdString })
      AND "postId"=$1;
    `, [postId]);

    // and create post_tags as necessary
    await addTagsToPost(postId, tagList);

    return await getPostById(postId);
  } catch (error) {
    throw error;
  }
}

async function getAllPosts() {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id
      FROM posts;
    `);

    const posts = await Promise.all(postIds.map(
      post => getPostById( post.id )
    ));

    return posts;
  } catch (error) {
    throw error;
  }
}

async function getPostsByUser(userId) {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id 
      FROM posts 
      WHERE "authorId"=${ userId };
    `);

    const posts = await Promise.all(postIds.map(
      post => getPostById( post.id )
    ));

    return posts;
  } catch (error) {
    throw error;
  }
}


async function getUserById(userId){
  try {
    // const posts = await getPostsByUser(userId)
    // console.log(posts)
    const {rows} = await client.query(`
      SELECT * FROM users WHERE id = ${ userId }
    `)
    if(rows.length < 1) return null
    delete rows[0].password
    const posts = await getPostsByUser(rows[0].id)
    rows[0]["posts"] = posts
    console.log(rows)
    return rows[0]

  } catch (error) {
    console.log("we are here")
    throw error;
  }
}

async function createTags(tagList) {
  if (tagList.length === 0) { 
    return; 
  }
  //console.log(tagList)
  // need something like: $1), ($2), ($3 
  const insertVal = tagList.map((_, index) => `$${index + 1}`).join('),(')
  //console.log("insertVal:",insertVal);
  const selectValues = tagList.map(
        (_, index) => `$${index + 1}`).join(', ');
  //console.log("selectValues: " + selectValues)
  try {
    const {rows: [tags]} = await client.query(`
     INSERT INTO tags(name) 
     VALUES (${insertVal})
     ON CONFLICT (name) DO NOTHING
    `, tagList)
    // insert the tags, doing nothing on conflict
    // returning nothing, we'll query after
    const {rows} = await client.query(`
      SELECT * FROM tags 
      WHERE name
      IN (${selectValues})
    `, tagList)
    console.log(rows)
    return rows
    // select all tags where the name is in our taglist
    // return the rows from the query
  } catch (error) {
    throw error;
  }
}

async function createPostTag(postId, tagId) {
 
  try {
    await client.query(`
      INSERT INTO post_tags("postId", "tagId")
      VALUES ($1, $2)
      ON CONFLICT ("postId", "tagId") DO NOTHING;
    `, [postId, tagId]);
  } catch (error) {
    throw error;
  }
}

async function getPostsByTagName(tagName) {
  console.log("getting posts by tag name", tagName);
  try {
    const {rows: [tag]} = await client.query(`
      SELECT id
      FROM tags
      WHERE name = $1
    `, [tagName]);

    //console.log(tag.id)

    const {rows} = await client.query(`
    SELECT "postId"
    FROM post_tags
    WHERE "tagId" = $1
  `, [tag.id]);
    
  //console.log(posts)
  const postIds = []
  for(let id of rows){
    postIds.push(id.postId)
  }
  //console.log(postIds)
  
  const allPosts = await Promise.all(postIds.map(
    post => getPostById( post )
  ));
  
    return allPosts;
  } catch (error) {
    throw error;
  }
}

async function addTagsToPost(postId, tagList) {
  
  try {
    const createPostTagPromises = tagList.map(
      tag => createPostTag(postId, tag.id)
    );

    await Promise.all(createPostTagPromises);

    return await getPostById(postId);
  } catch (error) {
    throw error;
  }
}

async function getPostById(postId) {
  try {
    const { rows: [ post ]  } = await client.query(`
      SELECT *
      FROM posts
      WHERE id=$1;
    `, [postId]);

    if (!post) {
      throw {
        name: "PostNotFoundError",
        message: "Could not find a post with that postId"
      };
    }

    const { rows: tags } = await client.query(`
      SELECT tags.*
      FROM tags
      JOIN post_tags ON tags.id=post_tags."tagId"
      WHERE post_tags."postId"=$1;
    `, [postId])

    const { rows: [author] } = await client.query(`
      SELECT id, username, name, location
      FROM users
      WHERE id=$1;
    `, [post.authorId])

    post.tags = tags;
    post.author = author;

    delete post.authorId;

    return post;
  } catch (error) {
    throw error;
  }
}

async function getAllTags(){
  const {rows} = await client.query(`
  SELECT *
  FROM tags;
  `);

  return rows;
}

async function getUserByUsername(username) {
  try {
    const { rows: [user] } = await client.query(`
      SELECT *
      FROM users
      WHERE username=$1;
    `, [username]);

    return user;
  } catch (error) {
    throw error;
  }
}

module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getPostsByUser,
    getUserById,
    getAllPosts,
    createTags,
    createPostTag,
    addTagsToPost,
    getPostById,
    getAllTags,
    getUserByUsername,
    getPostsByTagName
}

