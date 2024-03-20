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
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Timeout for server selection
    socketTimeoutMS: 45000 // Timeout for individual operations
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
    name: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
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

// Display all todo items for the authenticated user
app.get("/", isAuthenticated, (req, res) => {
    Todo.find({ user: req.user._id }, (error, todoList) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error fetching todo items');
        } else {
            res.render("index.ejs", { todoList: todoList });
        }
    });
});

// Add new task for the authenticated user
app.post("/newtodo", isAuthenticated, (req, res) => {
    const newTask = new Todo({
        name: req.body.task,
        user: req.user._id
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

// Delete task by id for the authenticated user
app.get("/delete/:id", isAuthenticated, (req, res) => {
    const taskId = req.params.id;
    Todo.deleteOne({ _id: taskId, user: req.user._id }, (err, result) => {
        if (err) {
            console.log(`Error in deleting the task ${taskId}`);
            res.status(500).send('Error deleting task');
        } else {
            console.log("Task successfully deleted from database");
            res.redirect("/");
        }
    });
});

// Delete all tasks for the authenticated user
app.post("/delAlltodo", isAuthenticated, (req, res) => {
    Todo.deleteMany({ user: req.user._id }, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error deleting all tasks');
        } else {
            console.log(`Deleted all tasks`);
            res.redirect("/");
        }
    });
});

// Update task by id for the authenticated user
app.post("/updatetodo/:id", isAuthenticated, (req, res) => {
    const taskId = req.params.id;
    const newName = req.body.newName;

    Todo.findOneAndUpdate({ _id: taskId, user: req.user._id }, { name: newName }, (err, updatedTodo) => {
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
    res.render('register', {});
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
