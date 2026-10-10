const COMMAND_NAMES = ['track', 'jobtrack', 'jt'];
const SUBCOMMANDS = ['add', 'list', 'filter', 'update', 'stats', 'stale', 'export', 'completion', 'help'];

function bashScript() {
  const names = COMMAND_NAMES.join(' ');
  const subs = SUBCOMMANDS.join(' ');
  return `_job_tracker_complete() {
  local cur
  cur="\${COMP_WORDS[COMP_CWORD]}"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${subs}" -- "$cur") )
  fi
}
complete -F _job_tracker_complete ${names}
`;
}

function pwshScript() {
  const names = COMMAND_NAMES.map((n) => `'${n}'`).join(',');
  const subs = SUBCOMMANDS.map((s) => `'${s}'`).join(',');
  return `Register-ArgumentCompleter -Native -CommandName ${names} -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    @(${subs}) | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
}
`;
}

module.exports = { bashScript, pwshScript };
