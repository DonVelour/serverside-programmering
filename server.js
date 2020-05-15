var http = require('http')
var url = require("url")
var mysql = require('mysql')
var body = require("body")
var bcrypt = require("bcrypt")

var con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'chat_app'
});

var server = http.createServer(function(req, res) {
  var userid
  var username
  var parsedURL = url.parse(req.url)

  if(parsedURL.pathname == "/users"){
    con.connect(function(err) {
      con.query("SELECT * FROM users", function(err, data) {
        res.write(JSON.stringify(data))
        res.end()
      });
    });
  }
  if(parsedURL.pathname == "/signup") {
      body(req, {}, (err,txt)=> {
        var parsed = JSON.parse(txt)
        var sql = 'SELECT COUNT(*) AS Count FROM users WHERE email = ?';
        con.query(sql,[parsed.email], function(err, data) {
          if(data[0].Count >= 1) {
            res.end(JSON.stringify({"status": "Email is taken"}))
          }
          else {
            bcrypt.hash(parsed.password, 10, function(err,hash){
              con.connect(function() {
                con.query("INSERT INTO users (user_name, email, password) VALUES (?,?,?)", [parsed.user_name, parsed.email, hash], function(err, result){
                  var stuff = {
                    userid: result.insertId,
                    username: parsed.user_name,
                    status: "User created"
                  }
                  console.log(JSON.stringify(stuff))
                  res.write(JSON.stringify(stuff))

                  res.statuscode = 200
                  res.end()
                })
              })
            })
          }
      })
    })
  }
  if(parsedURL.pathname == "/signin") {
    body(req, {}, (err,txt)=> {
      var parsed = JSON.parse(txt)
      con.connect(function() {
        con.query("SELECT * FROM users WHERE email = ?", [parsed.email], function(err,data){
          data.forEach((data) => {
            var hash = data.password
            bcrypt.compare(parsed.password, hash, function(err,confirmed){
              if(confirmed)
              {
                var stuff = {
                  status: "wellcome",
                  userid: data.id,
                  username: data.user_name
                }

                console.log(JSON.stringify(stuff))
                res.end(JSON.stringify(stuff))
              }
              else
              {
                res.end(JSON.stringify({"status": "Email or password did not match"}))
                console.log("Email or password did not match")
              }
            })
          });
        })
      })
    })
  }
  if(parsedURL.pathname == "/getchats"){

    body(req, {}, (err,txt)=> {
      var parsed = JSON.parse(txt)
      con.connect(function() {
        con.query("SELECT chats.id, chats.chat_name, chats.chat_link FROM chats INNER JOIN chat_members ON chats.id = chat_members.chat_id WHERE chat_members.user_id = ?", [parsed.userid], function(err,data){
          res.write(JSON.stringify(data))
          res.end()
        })
      })
    })
  }
  if(parsedURL.pathname == "/getmessages") {
    body(req, {}, (err,txt)=> {
      var parsed = JSON.parse(txt)
      con.connect(function() {
        con.query("SELECT messages.text, messages.user_id, users.user_name FROM messages INNER JOIN users ON messages.user_id = users.id WHERE chat_id = ?", [parsed.chatid], function(err,data) {
          res.end(JSON.stringify(data))
        });
      });
    });

  }
  if(parsedURL.pathname == "/newmessages") {
    body(req, {}, (err,txt)=> {
      var parsed = JSON.parse(txt)
        con.connect(function() {
        con.query("INSERT INTO messages (user_id, chat_id, text) VALUES (?, ?, ?)", [parsed.userid, parsed.chatid, parsed.text], function(err, result){
          res.statuscode = 200
          res.end()
        });
      });
    });
  };
  if(parsedURL.pathname == "/messagecheck") {
    body(req, {}, (err, txt)=> {
      var parsed = JSON.parse(txt)
      con.connect(function(){
        con.query("SELECT messages.text, messages.user_id, users.user_name FROM messages INNER JOIN users ON messages.user_id = users.id WHERE chat_id = ? LIMIT ?, ?", [parsed.chatid, parseInt(parsed.arrcount), parseInt(parsed.arrcount) + 200], function(err,data){
          res.statuscode = 200
          console.log(data);
          res.end(JSON.stringify(data))
        })
      })
    });
  };
  if(parsedURL.pathname == "/joinchat") {
    body(req, {}, (err,txt)=> {
      var parsed = JSON.parse(txt)
      con.connect(function() {
        con.query("SELECT id, chat_name FROM chats WHERE chat_link = ?", [parsed.chat_link], function(err,data) {
          if(data.length > 0)
          {
            con.query("INSERT INTO chat_members (chat_id, user_id) VALUES (?,?)", [data[0].id, parsed.userid], function(err,result){
              res.end(JSON.stringify({status: "found", chatid: data[0].id, chat_name: data[0].chat_name}))
            })
          }
          else
          {
            res.end(JSON.stringify({status: "no chat found"}))
          }
        });
      });
    });
  }


});

server.listen(8080)
