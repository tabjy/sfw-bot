const { ApplicationCommandType } = require('discord-api-types/v10')
const { SnowflakeUtil } = require('discord.js')
// const {
//   SlashCommandBuilder,
//   SlashCommandSubcommandGroupBuilder,
//   SlashCommandSubcommandBuilder
// } = require('@discordjs/builders')

const { camelToSnakeCase } = require('./utils')

module.exports = class Command {
  /* eslint-disable camelcase */
  constructor ({
    type = ApplicationCommandType.ChatInput, // must be ChatInput
    guild_id,
    name = ((name) => {
      name = camelToSnakeCase(name)
      if (name.endsWith('-command')) {
        name = name.substring(0, name.length - ('-command'.length))
      }
      return name
    })(this.constructor.name),
    name_localizations,
    description = '',
    description_localizations,
    // options = [],
    default_member_permissions,
    dm_permission = true,
    version = SnowflakeUtil.generate()
  } = {}) {
    if (type !== ApplicationCommandType.ChatInput) {
      throw new Error(`command type ${type} not yet supported!`)
    }

    if (guild_id) {
      throw new Error('guid specific commands not yet supported!')
    }

    // TODO: collect options from annotations
    this.data = {
      // type,
      // guild_id,
      name,
      // name_localizations,
      description: 'test'
      // description_localizations,
      // default_member_permissions,
      // dm_permission,
      // version
    }
  }

  async init () {

  }

  default (interaction) {
    throw new Error('default() must be overridden and implemented!')
  }
}

// const command = new SlashCommandBuilder()
//   .setName('info')
//   .setDescription('Get info about a user or a server!')
//   .addSubcommand(subcommand =>
//     subcommand
//       .setName('user')
//       .setDescription('Info about a user')
//       .addUserOption(option => option.setName('target').setDescription('The user')))
//   .addSubcommand(subcommand =>
//     subcommand
//       .setName('server')
//       .setDescription('Info about the server'));

// const command = new SlashCommandBuilder()
//   .setName('permissions')
//   .setDescription('Get or edit permissions for a user or a role')
//   .addSubcommandGroup(
//     new SlashCommandSubcommandGroupBuilder()
//       .setName('user')
//       .setDescription('Get or edit permissions for a user')
//       .addSubcommand(
//         new SlashCommandSubcommandBuilder()
//           .setName('get')
//           .setDescription('Get permissions for a user')
//           .addUserOption(option =>
//             option.setName('user').setDescription('The user to get').setRequired(true)
//           )
//           .addChannelOption(option =>
//             option.setName('channel').setDescription('The channel permissions to get. If omitted, the guild permissions will be returned')
//           )
//       )
//       .addSubcommand(
//         new SlashCommandSubcommandBuilder()
//           .setName('set')
//           .setDescription('Set permissions for a user')
//           .addUserOption(option =>
//             option.setName('user').setDescription('The user to set').setRequired(true)
//           )
//           .addChannelOption(option =>
//             option.setName('channel').setDescription('The channel permissions to set. If omitted, the guild permissions will be set')
//           )
//       )
//   )
//   .addSubcommandGroup(
//     new SlashCommandSubcommandGroupBuilder()
//       .setName('role')
//       .setDescription('Get or edit permissions for a role')
//       .addSubcommand(
//         new SlashCommandSubcommandBuilder()
//           .setName('get')
//           .setDescription('Get permissions for a role')
//           .addRoleOption(option =>
//             option.setName('role').setDescription('The role to get').setRequired(true)
//           )
//           .addChannelOption(option =>
//             option.setName('channel').setDescription('The channel permissions to get. If omitted, the guild permissions will be returned')
//           )
//       )
//       .addSubcommand(
//         new SlashCommandSubcommandBuilder()
//           .setName('set')
//           .setDescription('Set permissions for a role')
//           .addRoleOption(option =>
//             option.setName('role').setDescription('The role to set').setRequired(true)
//           )
//           .addChannelOption(option =>
//             option.setName('channel').setDescription('The channel permissions to set. If omitted, the guild permissions will be set')
//           )
//       )
//   ).toJSON()
//
// console.log(require('util').inspect(command, { depth: 100 }))
