var jwt = require('jsonwebtoken');


function generateToken(id) {
    var token = jwt.sign({ id },
        process.env.SECRET_KEY,
        { expiresIn: "30d" }
    );
    return token
}

module.exports = generateToken