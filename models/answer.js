var Answer = require('./models.js').Answer;
var co = require('co');
var getPost = require('../helper/getPost.js');


/************Answer API 需要重构*******************************/
/************Answer API 需要重构*******************************/
/************Answer API 需要重构*******************************/

/************** Answer API *************************/
Answer.add = function (req, res, Question) {
    // 判断用户是否登录
    if (!req.session.login) {
        res.send({status: 0, msg: 'login is required'});
        return;
    }
    // 获取post参数
    getPost(req).then(function (fields) {
        // 判断是否传入questionId和content
        if (!fields.questionId || !fields.content) {
            res.send({status: 0, msg: 'questionId and content are required'});
            return;
        }

        // 判断questionId的问题是否存在
        Question.findById(fields.questionId).then(function (question) {
            if (!question) {
                res.send({status: 0, msg: 'question dose not exist'});
                return;
            }
            // 该用户是否回答过该问题
            Answer.findOne({
                where: {
                    questionId: fields.questionId,
                    userId: req.session.user_id
                }
            }).then(function (answer) {
                if (answer) {
                    res.send({status: 0, msg: '您已经回答过该问题'});
                    return;
                }
                // 没有回答过，则存入数据库
                Answer.create({
                    content: fields.content,
                    questionId: fields.questionId,
                    userId: req.session.user_id
                }).then(function (answer) {
                    res.send({status: 1, msg: 'answer inserts into db successfully'});
                }).catch(function (err) {
                    console.log(err);
                    res.send({status: 0, msg: 'answer inserts into db failed'});
                });
            });
        });
    });
};

Answer.change = function (req, res) {
    // 判断用户是否登录
    if (!req.session.login) {
        res.send({status: 0, msg: 'login is required'});
        return;
    }
    // 获取post参数
    getPost(req).then(function (fields) {
        // 判断是否传入questionId和content
        if (!fields.id || !fields.content) {
            res.send({status: 0, msg: 'id and content are required'});
            return;
        }
        // 找到这条answer
        Answer.findById(fields.id).then(function (answer) {
            if (!answer) {
                res.send({status: 0, msg: 'answer does not exist'});
                return;
            }
            // 判断回答者是否为该登录用户
            if (answer.userId != req.session.user_id) {
                res.send({status: 0, msg: 'permission is denied'});
                return;
            }
            // 更新answer，保存
            answer.update({
                content: fields.content
            }).then(function (result) {
                res.send({status: 1, msg: 'answer updates ok'});
            }).catch(function (err) {
                res.send({status: 0, msg: 'answer updates failed'});
            });
        }).catch(function (err) {
            res.send({status: 0, msg: 'answer updates failed'});
        });
    })
};



// 查看answer API
Answer.read = function (req, res, User) {
    co(function *() {
        var params = yield getPost(req);
    // 检验是否传入 answerId 或者 questionId 或者某个用户的id
        if (!params.id && !params.questionId && !params.userId) {
            res.send({status: 0, msg: 'id or questionId or userId is required'});
            return;
        }

        // 查看单个answer
        // 如果传入的是id，则查找这条answer
        if (params.id) {

            var answer = yield Answer.findById(params.id);
            if (!answer) {
                res.send({status: 0, msg: 'answer does not exist'});
                return;
            }

            var answer_data = {};
            answer_data.id = answer.id;
            answer_data.content = answer.content;
            answer_data.createdAt = answer.createdAt;
            answer_data.updatedAt = answer.updatedAt;
            answer_data.userId = answer.userId;
            answer_data.questionId = answer.questionId;

            // 如果answer存在，则查出vote表的投票信息；
            var votes = [];
            votes = yield answer.getVotes();
            answer_data.votes = votes;
            res.send({status: 1, data: answer_data});
        }

        // 如果传入的是userId
        if(params.userId){
            var userId;
            if(params.userId == 'self'){
                if(!req.session.login){
                    res.send({status:0, msg:'login required'});
                    return;
                }
                userId = req.session.user_id;
            } else{
                userId = params.userId;
                // 查看用户是否存在
                var user = yield User.findById(userId);
                if(!user){
                    res.send({status:0, msg:'user does not exist'});
                    return;
                }
            }
            // 查找该用户的所有answer
            var user = yield User.findById(userId);
            var answers = yield user.getAnswers();
            if(!answers.length){
                res.send({status:1, data:answers});
                return;
            }
            var arr = [];
            for(var answer of answers){
                var answer_data = {};
                answer_data.id = answer.id;
                answer_data.content = answer.content;
                answer_data.createdAt = answer.createdAt;
                answer_data.updatedAt = answer.updatedAt;
                answer_data.userId = answer.userId;
                answer_data.questionId = answer.questionId;

                // 查出vote表的投票信息；
                answer_data.votes = yield answer.getVotes();
                // 查出属于哪个question
                answer_data.question = yield answer.getQuestion();
                //console.log('q',question)
                arr.push(answer_data);
            }
            res.send({status: 1, data: arr});
        }

        // 如果传入的是questionId，则查找对应question的所有answer
        if (params.questionId) {
            Answer.findAll({where: {questionId: params.questionId}}).then(function (answers) {
                res.send({status: 1, data: answers});
            })
        }
    });
};

module.exports = Answer;