const { 
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost
} = require('./index');

async function createInitialUser() {
    try {
        console.log('Creating initial user')
        await createUser({username: 'albert', password: 'bertie99',  name: 'Al Bert', location: 'Sidney, Australia' })
        await createUser({username: 'sandra', password: '2sandy4me', name: 'Just Sandra', location: "Ain't telling" })
        await createUser({username: 'glamgal', password: 'soglam',   name: 'Joshua', location: 'Upper East Side'})
       
        console.log("Finished creating initial user")
    } catch (error) {
        console.log("Error creating initial user")
        throw error;
    }
}

//this function should call a query which drops all tables from our database
async function dropTables(){
    try {
        console.log("Starting to drop tables...");
        await client.query(`
        DROP TABLE IF EXISTS posts, users
        
        `);
        console.log("Finished dropping tables!");
    } catch (error) {
      console.error("Error dropping tables!");
      throw error;
    }
}

//this function should  call a query which creates all tables for our database
async function createTables(){
    try {

        console.log("Starting to build tables...");
        await client.query(`
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username varchar(255) UNIQUE NOT NULL,
            password varchar(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            location VARCHAR(255) NOT NULL,
            active BOOLEAN DEFAULT true
          );
        `)
        await client.query(`
        CREATE TABLE posts(
            id SERIAL PRIMARY KEY,
            "authorId" INTEGER REFERENCES users(id) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            active BOOLEAN DEFAULT true
        )
        
        `)
        console.log("Finished building tables!");
    } catch (error) {
      console.error("Error building tables!");
      throw error;
    }
  }


async function rebuildDB(){
    try {
       client.connect()

       await dropTables();
       await createTables();
       await createInitialUser()
    } catch (error) {
       throw error;
    }
}

async function testDB() {
    try {
      console.log("Starting to test database...");
  
      console.log("Calling getAllUsers");
      const users = await getAllUsers();
      console.log("Result:", users);

      console.log("Calling updateUser on users[0]");
      const updateUserResult = await updateUser(users[0].id, {
          name: "NewName SoGood",
          location: "Somewhere, KY"
      });
      console.log("Result:", updateUserResult);
  
      console.log("Finished database tests!");
    } catch (error) {
      console.error("Error testing database!");
      throw error;
    }
  }

rebuildDB()
  .then(testDB)
  .catch(console.error)
  .finally(() => client.end());