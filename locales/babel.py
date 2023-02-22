import os

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

class CustomBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        
        """
        import os
        
        os.system('hatch run i18n:all')
        """

        from babel.messages.frontend import compile_catalog
        
        cmd = compile_catalog()
        cmd.directory = "locales"
        cmd.finalize_options()
        cmd.run()
