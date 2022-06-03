const { Client } = require('pg') //imports the pg module

const client = new Client('postgres://localhost:5432/juicebox-dev')

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

async function createPost(authorId, title, content){
    try {
        const {rows: [posts]} = await client.query(`
        INSERT INTO users(authorId, title, content) VALUES ($1, $2, $3, $4)
        
        RETURNING *;
      `, [ authorId, title, content ]);
    
        return posts
      } catch (error) {
        throw error;
      } 
}

module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost
}