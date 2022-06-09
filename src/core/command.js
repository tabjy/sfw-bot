const { SnowflakeUtil } = require('discord.js')

const {
  camelToSnakeCase,
  createSimpleAnnotation,
  lookupClassFunctionsWithAnnotation, getAnnotation
} = require('./utils')
const { ApplicationCommandOptionType } = require('discord-api-types/v10')

const annotations = {
  defaultHandler: createSimpleAnnotation(Symbol('Command.ANNOTATION_KEYS.INIT_HANDLER')),
  initHandler: createSimpleAnnotation(Symbol('Command.ANNOTATION_KEYS.DEFAULT_HANDLER')),
  subcommandHandler: createSimpleAnnotation(Symbol('Command.ANNOTATION_KEYS.SUBCOMMAND_HANDLER'))
}

class Command {
  constructor (
    {
      // type = ApplicationCommandType.ChatInput, // must be ChatInput
      // guild_id,
      name = ((name) => {
        name = camelToSnakeCase(name)
        if (name.endsWith('-command')) {
          name = name.substring(0, name.length - ('-command'.length))
        }
        return name
      })(this.constructor.name),
      nameLocalizations,
      description = '(description not available)',
      descriptionLocalizations,
      // options = [],
      defaultMemberPermissions,
      dmPermission,
      version = SnowflakeUtil.generate()
    } = {}
  ) {
    this.data = {
      name,
      name_localizations: nameLocalizations,
      description,
      description_localizations: descriptionLocalizations,
      default_member_permissions: defaultMemberPermissions,
      dm_permission: dmPermission,
      version
    }

    const defaultHandler = lookupClassFunctionsWithAnnotation(this.constructor, annotations.defaultHandler)[0]
    if (defaultHandler) {
      const { options } = getAnnotation(defaultHandler, annotations.defaultHandler)
      this.data.options = options
    } else {
      const subcommandHandlers = lookupClassFunctionsWithAnnotation(this.constructor, annotations.subcommandHandler)
      this.data.options = []
      for (const subcommandHandler of subcommandHandlers) {
        this.data.options.push({
          type: ApplicationCommandOptionType.Subcommand,
          ...getAnnotation(subcommandHandler, annotations.subcommandHandler)
        })
      }
    }

    this.data = Object.assign(
      {},
      ...Object.entries(this.data).filter(([k, v]) => v !== undefined).map(([k, v]) => ({ [k]: v }))
    )
  }
}

module.exports = {
  Command,
  ...annotations
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
