const isEmpty = passString => {
  if (passString === undefined) return true;

  if (passString.trim() === "") {
    return true;
  } else {
    return false;
  }
};

const isEmail = email => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

exports.validateSignupData = data => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Email must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Email be a valid Email";
  }

  if (isEmpty(data.password)) errors.password = "Password must not be empty";
  if (data.password !== data.conformPassword)
    errors.conformPassword = "Password does not match";

  if (isEmpty(data.handle)) errors.handle = "Handles must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateLoginData = data => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Email must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Email be a valid Email";
  }

  if (isEmpty(data.password)) errors.password = "Password must not be empty";

  // if (Object.keys(errors).length > 0) res.status(400).json(errors);

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.reduceUserDetails = data => {
  console.log("Hers is ur data beig passed in", data);
  let userDetails = {};

  if (!isEmpty(data.bio)) userDetails.bio = data.bio;
  if (!isEmpty(data.website)) {
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }

  if (!isEmpty(data.location)) userDetails.location = data.location;

  return userDetails;
};
