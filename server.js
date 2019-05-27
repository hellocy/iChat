let express = require('express');
let app = express();
let server = require('http').createServer(app);
let io = require('socket.io').listen(server);
let bodyParser = require('body-parser');
let moment = require('moment');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

let mysql = require('mysql');
let pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'ichat'
});

let session = require('express-session');

app.use(session({
    secret: 'iChat',
    cookie: {maxAge: 3600000},
    resave: false,
    saveUninitialized: false,
}));

app.post('/reg', function(req, res, next){
    let uname = req.body.uname;
    let upwd = req.body.upwd;
    let sex = req.body.sex;
    let headImg = req.body.headImg;
    let create_time = moment().format('YYYY-M-D HH:mm:ss');
    let balance = 0;
    let query = 'INSERT INTO users(name, pwd, sex, head, create_time) VALUES(?, ?, ?, ?, ?)';

    //将用户信息写入db
    let arr = [uname, upwd, sex, headImg, create_time];
    pool.query(query, arr, rows => {
        res.json({code: 200, msg: '用户添加成功！'});
    }); 
});

app.post('/login', function(req, res, next){
    
    let uname = req.body.uname;
    let upwd = req.body.upwd;
    pool.query('SELECT * from users where name = "' + uname + '"', function(err, rows){
        if (!rows.length) {
            res.json({code: 400, msg: '用户名不存在'});
            return;
        }
        let pwd = rows[0].pwd;
        if(upwd == pwd){
            let user = {
                user_id: rows[0].id,
                user_name: rows[0].name
            };
            req.session.login = user;
            console.log("login write session: ", req.session.login);
            res.json({code: 200, msg: '登录成功', data: user});
        } else {
            res.json({code: 400, msg: '密码错误'});
        }
    })  
});

// 退出登录
app.get('/logout', function(req, res, next){
    // 备注：这里用的 session-file-store 在destroy 方法里，并没有销毁cookie
    // 所以客户端的 cookie 还是存在，导致的问题 --> 退出登陆后，服务端检测到cookie
    // 然后去查找对应的 session 文件，报错
    // session-file-store 本身的bug    

    req.session.destroy(function(err) {
        if(err){
            res.json({ret_code: 2, ret_msg: '退出登录失败'});
            return;
        }
        
        // req.session.loginUser = null;
        res.clearCookie(identityKey);
        res.redirect('/');
    });
});

//指定页面文件路径
app.use('/', express.static(__dirname + '/frontend'));

server.listen(process.env.PORT || 3000);

io.sockets.on('connection', function(socket) {
    socket.on('postMsg', function(userinfo, msg) {
    	console.log(userinfo)
        socket.broadcast.emit('newMsg', userinfo, msg);
    });
});
