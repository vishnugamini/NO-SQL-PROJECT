var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var app = express();
var port = process.env.PORT || 3000;

// Database connection with mongoose (MongoDB)
mongoose.connect("mongodb+srv://vishnugamini:vishnugamini@cluster0.0trohxu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// To get the CSS file from the public folder
app.use(express.static(__dirname + '/public'));

// Interact with index.ejs
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

// Mongoose schema
var todoSchema = new mongoose.Schema({
    name: String
});

var Todo = mongoose.model("Todo", todoSchema);

// Routes

// Display all todo items
app.get("/", (req, res)=>{
    Todo.find({}, (error, todoList)=>{
        if(error){
            console.log(error);
        }
        else{
            res.render("index.ejs", {todoList: todoList});
        }
    });
});

// Add new task
app.post("/newtodo", (req, res)=>{
    var newTask = new Todo({
        name: req.body.task
    });
    // Add to database
    Todo.create(newTask, (err, Todo)=>{
        if(err){
            console.log(err);
        }
        else{
            console.log(`Inserted ${newTask} to the database`);
            res.redirect("/");
        }
    });
});

// Delete task by id
app.get("/delete/:id", (req, res)=>{
    var taskId = req.params.id;
    mongoose.model('Todo').deleteOne({_id: taskId}, (err, result)=>{
        if(err){
            console.log(`Error in deleting the task ${taskId}`);
        }
        else{
            console.log("Task successfully deleted from database");
            res.redirect("/");
        }
    });
});

// Delete all tasks
app.post("/delAlltodo", (req, res)=>{
    mongoose.model('Todo').deleteMany({}, (err, result)=>{
        if(err){
            console.log(err);
        }
        else{
            console.log(`Deleted all tasks`);
            res.redirect("/");
        }
    });
});

// Update task by id
app.post("/updatetodo/:id", (req, res)=>{
    var taskId = req.params.id;
    var newName = req.body.newName;
    
    Todo.findByIdAndUpdate(taskId, {name: newName}, (err, updatedTodo)=>{
        if(err){
            console.log(err);
        }
        else{
            console.log("Task successfully updated");
            res.redirect("/");
        }
    });
});

// Catch invalid GET requests
app.get("*", (req, res)=>{
    res.send("<h1>Invalid Page</h1>");
});

// Listen on port 3000
app.listen(port, (error)=>{
    if(error){
        console.log("Issue in connecting to the server");
    }
    else{
        console.log("Successfully connected to the server");
    }
});
