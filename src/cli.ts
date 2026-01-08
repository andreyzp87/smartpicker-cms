import { Command } from 'commander'

const program = new Command()

program.name('smartpicker-cli').description('CLI for SmartPicker CMS').version('0.1.0')

program
  .command('import')
  .description('Import data from sources')
  .action(() => {
    console.log('Importing data...')
  })

program.parse()
