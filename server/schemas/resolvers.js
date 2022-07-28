const { AuthenticationError } = require("apollo-server-express");
const { User } = require("../models");
const { signToken } = require("../utils/auth");

const resolvers = {
  Query: {
    me: async ({ user = null, params }, res) => {
      return User.findOne(
        { _id: user ? user._id : params.id },
        { username: params.username }
      );
    },
  },

  Mutation: {
    createUser: async ({ body }, res) => {
      const user = await User.create({ body }, res);
      const token = signToken(user);

      return { token, user };
    },
    login: async ({ body }, res) => {
      const user = await User.findOne({
        $or: [{ username: body.username }, { email: body.email }],
      });

      if (!user) {
        throw new AuthenticationError("Can't find this user");
      }

      const correctPw = await user.isCorrectPassword(body.password);

      if (!correctPw) {
        throw new AuthenticationError("Incorrect password!");
      }

      const token = signToken(user);
      return { token, user };
    },

    // Add a third argument to the resolver to access data in our `context`
    saveBook: async (parent, { bookData }, context) => {
      // If context has a `user` property, that means the user executing this mutation has a valid JWT and is logged in
      if (context.user) {
        return User.findOneAndUpdate(
          { _id: context.user._id },
          { $addToSet: { savedBooks: bookData } },
          { new: true, runValidators: true }
        );
      }

      // If user attempts to execute this mutation and isn't logged in, throw an error
      // throw new AuthenticationError("You are not logged in!");
    },
    // Set up mutation so a logged in user can only remove their profile and no one else's
    removeBook: async (parent, { bookId }, context) => {
      if (context.user) {
        return User.findOneAndUpdate(
          { _id: context.user._id },
          { $pull: { savedBooks: { bookId } } },
          { new: true }
        );
      }
    },
  },
};

module.exports = resolvers;
