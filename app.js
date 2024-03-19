const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Database connection with mongoose (MongoDB)
mongoose.connect("mongodb://vishnugamini:vishnugamini@ac-ehuqk1l-shard-00-00.0trohxu.mongodb.net:27017,ac-ehuqk1l-shard-00-01.0trohxu.mongodb.net:27017,ac-ehuqk1l-shard-00-02.0trohxu.mongodb.net:27017/?authSource=admin&replicaSet=atlas-gda4y5-shard-0&retryWrites=true&w=majority&appName=Cluster0&ssl=true", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// To get the CSS file from the public folder
app.use(express.static(__dirname + '/public'));

// Interact with EJS templates
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize session
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Add connect-flash middleware
app.use(flash());

// Mongoose schemas
const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const todoSchema = new mongoose.Schema({
    name: String
});

const User = mongoose.model("User", userSchema);
const Todo = mongoose.model("Todo", todoSchema);

// Passport Local Strategy
passport.use(new LocalStrategy(
    function(username, password, done) {
        User.findOne({ username: username }, function(err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false, { message: 'Incorrect username.' }); }
            if (user.password !== password) { return done(null, false, { message: 'Incorrect password.' }); }
            return done(null, user);
        });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

// Routes

// Display all todo items
app.get("/", isAuthenticated, (req, res) => {
    Todo.find({}, (error, todoList) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error fetching todo items');
        } else {
            res.render("index.ejs", { todoList: todoList });
        }
    });
});
app.get('/register', (req, res) => {
    res.render('register', { message: req.flash('error'), successMessage: req.flash('success') });
});


// Add new task
app.post("/newtodo", isAuthenticated, (req, res) => {
    const newTask = new Todo({
        name: req.body.task
    });
    // Add to database
    Todo.create(newTask, (err, todo) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error adding new task');
        } else {
            console.log(`Inserted ${newTask} to the database`);
            res.redirect("/");
        }
    });
});
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    User.findOne({ username: username }, (err, user) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error checking for existing user');
        } else if (user) {
            req.flash('error', 'Username already exists');
            res.redirect('/register');
        } else {
            const newUser = new User({ username, password });
            newUser.save((err) => {
                if (err) {
                    console.log(err);
                    res.status(500).send('Error creating new user');
                } else {
                    req.flash('success', 'User registered successfully');
                    setTimeout(() => {
                        res.redirect('/login'); // Redirect to login page after a short delay
                    },3000); // Redirect after 1 second (adjust as needed)
                }
            });
        }
    });
});


// Delete task by id
app.get("/delete/:id", isAuthenticated, (req, res) => {
    const taskId = req.params.id;
    Todo.deleteOne({ _id: taskId }, (err, result) => {
        if (err) {
            console.log(`Error in deleting the task ${taskId}`);
            res.status(500).send('Error deleting task');
        } else {
            console.log("Task successfully deleted from database");
            res.redirect("/");
        }
    });
});

// Delete all tasks
app.post("/delAlltodo", isAuthenticated, (req, res) => {
    Todo.deleteMany({}, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error deleting all tasks');
        } else {
            console.log(`Deleted all tasks`);
            res.redirect("/");
        }
    });
});

// Update task by id
app.post("/updatetodo/:id", isAuthenticated, (req, res) => {
    const taskId = req.params.id;
    const newName = req.body.newName;

    Todo.findByIdAndUpdate(taskId, { name: newName }, (err, updatedTodo) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error updating task');
        } else {
            console.log("Task successfully updated");
            res.redirect("/");
        }
    });
});

// Authentication Routes
app.get('/login', (req, res) => {
    res.render('login', { message: req.flash('error') }); // Display flash message if available
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true // Enable flash messages for failed login attempts
}));

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// User Registration Route
app.get('/register', (req, res) => {
    res.render('register', { message: req.flash('error') });
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;

    User.findOne({ username: username }, (err, user) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error checking for existing user');
        } else if (user) {
            req.flash('error', 'Username already exists');
            res.redirect('/register');
        } else {
            const newUser = new User({ username, password });
            newUser.save((err) => {
                if (err) {
                    console.log(err);
                    res.status(500).send('Error creating new user');
                } else {
                    req.flash('success', 'User registered successfully');
                    res.redirect('/login'); // Redirect to login page upon successful registration
                }
            });
        }
    });
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}
// Add a route to clear all users
// app.get('/clearusers', (req, res) => {
//     // Remove all documents from the User collection
//     User.deleteMany({}, (err) => {
//         if (err) {
//             console.log(err);
//             res.status(500).send('Error clearing users');
//         } else {
//             console.log('All users cleared successfully');
//             res.send('All users cleared successfully');
//         }
//     });
// });

// Catch invalid GET requests
app.get("*", (req, res) => {
    res.status(404).send("<h1>Invalid Page</h1>");
});

// Listen on port 3000
app.listen(port, (error) => {
    if (error) {
        console.log("Issue in connecting to the server");
    } else {
        console.log("Successfully connected to the server");
    }
});