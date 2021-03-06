require("dotenv").config();

process.env.PWD = process.cwd()

var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
const jwt = require("jsonwebtoken");

var app = express();

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nodelogin'
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/matrix'));
app.use(express.static(process.env.PWD + '/img'));
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(express.static(path.join(__dirname, 'public'))); // configure express to use public folder

var fs = require('fs');
fs.readdirSync('api').forEach(function (file) {
    if (file[0] == '.') return;
    var routeName = file.substr(0, file.indexOf('.'));
    require('./api/' + routeName)(app);
});

//<===================>
//<====== index ======>
//<===================>

app.get('/', function (request, response) {
    response.render('firstpage.ejs');
});

/*
app.get('/', function (request, response) {
    response.render('admin-homepage.ejs');
});
*/


//<===================>
//<====== login ======>
//<===================>

const loginMiddleware = (request, response, next) => {
    var username = request.body.username;
    var password = request.body.password;
    connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function (error, results, fields) {
        if (results.length > 0) {
            next();
        }
        else {
            response.send("Invalid Username or Password");
        }
    });
}

app.post('/login', loginMiddleware, function (request, response) {
    var username = request.body.username;
    var password = request.body.password;
    connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function (error, results, fields) {
        if (results.length > 0) {
            const user = { name: username };
            if (results[0].user_class == 1) {
                const accessToken = generateAccessToken(user);
                const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
                refreshTokens.push(refreshToken);
                response.json({ accessToken: accessToken, refreshToken: refreshToken });
                //response.render('admin-homepage.ejs');
            }
            else {
                const accessToken = generateAccessToken(user);
                const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
                refreshTokens.push(refreshToken);
                response.json({ accessToken: accessToken, refreshToken: refreshToken });
                //response.redirect('index2.html');
            }
        } else {
            response.send('Incorrect Username and/or Password!');
        }
        response.end();
    });
});

let refreshTokens = [];

app.get('/posts', authenticateToken, function (request, response){
    connection.query('SELECT * FROM accounts WHERE username = ?', [request.user.name], function (error, results, fields) {
        if (results.length > 0) response.status(200).json(results);
    });
})

app.post('/token', (request, response) => {
    const refreshToken = request.body.token;
    if (refreshToken == null) return response.sendStatus(401);
    if (!refreshTokens.includes(refreshToken)) return response.sendStatus(403);
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return response.sendStatus(403);
        const accessToken = generateAccessToken({ name: user.name });
        response.json({ accessToken: accessToken });
    })
})

function authenticateToken(request, response, next) {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return response.senStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return response.sendStatus(403);
        request.user = user;
        next();
    });
}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30s' });
}

app.get('/logout', function (request, response) {
    response.redirect('/');
});

//<=====================>
//<====== api get ======>
//<=====================>

app.get('/user', function (request, response) {
    connection.query('SELECT * FROM accounts', (err, results) => {
        if (err) {
            throw err;
            response.status(404);
        }
        else {
            response.status(200).json(results);
        }
    });
});


app.get('/user/(:id)', function (request, response) {
    connection.query('SELECT * FROM accounts WHERE id = ' + request.params.id, function (err, result) {
        if (err) {
            throw err;
            response.status(404);
        } else {
            response.status(200).json(result);
        }
    });
});

app.get('/course', function (request, response) {
    connection.query('SELECT * FROM courses', (err, results) => {
        if (err) {
            throw err;
            response.status(404);
        }
        else {
            response.status(200).json(results);
        }
    });
});

app.get('/course/:id', function (request, response) {
    connection.query('SELECT * FROM courses WHERE course_id = ' + request.params.id, function (err, result) {
        if (err) {
            throw err;
            response.status(404);
        } else {
            response.status(200).json(result);
        }
    });
});

//<========================>
//<====== admin site ======>
//<========================>

app.get('/admin-homepage.ejs', function (request, response) {
    response.render('admin-homepage.ejs');
});

const { addUser, editUser, deleteUser, deleteAllUser } = require('./routes/user');
app.post('/create-user', addUser);
app.post('/edit-user/(:id)', editUser);
app.get('/delete-user/(:id)', deleteUser);
app.delete('/delete-all-user', deleteAllUser);

const { addCourse, editCourse, deleteCourse, deleteAllCourse } = require('./routes/course');
app.post('/create-course', addCourse);
app.post('/edit-course/(:id)', editCourse);
app.get('/delete-course/(:id)', deleteCourse);
app.delete('/delete-all-course', deleteAllCourse);


app.get('/admin-manage-courses.ejs', function (request, response) {
    connection.query('SELECT * FROM courses', (err, results) => {
        if (err) {
            throw err;
        }
        else {
            var courses = results;
            response.render('admin-manage-courses.ejs', { courses: courses });
        }
    });
});

app.get('/admin-manage-users.ejs', function (request, response) {
    connection.query('SELECT * FROM accounts', (err, results) => {
        if (err) {
            throw err;
        }
        else {
            var accounts = results;
            response.render('admin-manage-users.ejs', { accounts: accounts });
        }
    });
});

app.get('/admin-profile.ejs', function (request, response) {
    connection.query('SELECT * FROM accounts WHERE id = 1', (err, results) => {
        if (err) {
            throw err;
        }
        else {
            var accounts = results;
            response.render('admin-profile.ejs', { accounts: accounts });
        }
    });
});

//<========================>
//<====== user site =======>
//<========================>

app.get('/profile.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/views/profile.html'));
});

app.get('/recent-course.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/views/recent-course.html'));
});

app.get('/inactive-courses.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/views/inactive-courses.html'));
});

app.get('/completed-courses.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/views/completed-courses.html'));
});

//<========================>
//<===== example site =====>
//<========================>

app.get('/index.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/index.html'));
});

app.get('/index2.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/index2.html'));
});

app.get('/charts.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/charts.html'));
});

app.get('/grid.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/grid.html'));
});

app.get('/tables.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/tables.html'));
});

app.get('/widgets.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/widgets.html'));
});

app.get('/form-basic.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/form-basic.html'));
});

app.get('/form-wizard.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/form-wizard.html'));
});

app.get('/pages-buttons.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/pages-buttons.html'));
});

app.get('/pages-calendar.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/pages-calendar.html'));
});

app.get('/pages-chat.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/pages-chat.html'));
});

app.get('/pages-elements.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/pages-elements.html'));
});

app.get('/pages-gallery.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/pages-gallery.html'));
});

app.get('/pages-invoice.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/pages-invoice.html'));
});

app.get('/icon-material.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/icon-material.html'));
});

app.get('/icon-fontawesome.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/icon-fontawesome.html'));
});

app.get('/authentication-login.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/authentication-login.html'));
});

app.get('/authentication-register.html', function (request, response) {
    response.sendFile(path.join(__dirname + '/matrix/html/ltr/authentication-register.html'));
});

//<================>
// app is on port...
//<================>
app.listen(3000);