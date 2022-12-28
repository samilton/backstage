import jetbrains.buildServer.configs.kotlin.v2019_2.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.commitStatusPublisher
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.dockerCommand
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.finishBuildTrigger

/*
The settings script is an entry point for defining a TeamCity
project hierarchy. The script should contain a single call to the
project() function with a Project instance or an init function as
an argument.

VcsRoots, BuildTypes, Templates, and subprojects can be
registered inside the project using the vcsRoot(), buildType(),
template(), and subProject() methods respectively.

To debug settings scripts in command-line, run the

    mvnDebug org.jetbrains.teamcity:teamcity-configs-maven-plugin:generate

command and attach your debugger to the port 8000.

To debug in IntelliJ Idea, open the 'Maven Projects' tool window (View
-> Tool Windows -> Maven Projects), find the generate task node
(Plugins -> teamcity-configs -> teamcity-configs:generate), the
'Debug' option is available in the context menu for the task.
*/

version = "2021.2"

project {

    params {
        param("project.documetation.url", "https://backstage.elliottmgmt.com/catalog/default/component/${{ values.name | dump }}")
    }

    description = "Build configuration for ${{ values.name | dump }}"
    buildType(Build)
    buildType(Publish)
    buildTypesOrder = arrayListOf(Build, Publish)
}

object Build : BuildType({
    templates(AbsoluteId("DevOps_BuildDockerAndHelm"))
    name = "Build"

    params {
        param("env.projectBuildVersion", "%project.buildVersion%")
        param("project.name", "{{ values.name | dump }}")
    }

    vcs {
        root(DslContext.settingsRoot)
    }

    steps {
        dockerCommand {
            name = "Build Docker image"
            id = "RUNNER_968"
            commandType = build {
                source = file {
                    path = "./%project.dockerContextFolder%/%project.dockerFile%"
                }
                contextDir = "./%project.dockerContextFolder%"
                namesAndTags = "%project.docker.imageName%"
                commandArgs = """--pull --build-arg GIT_BRANCH="%teamcity.build.branch%" --build-arg GIT_COMMIT="%project.buildHash%" --no-cache"""
            }
            param("dockerImage.platform", "linux")
        }
    }

    features {
        commitStatusPublisher {
            id = "BUILD_EXT_54"
            vcsRootExtId = "${DslContext.settingsRoot.id}"
            publisher = bitbucketServer {
                url = "%stash.url%"
                userName = "%stash.user%"
                password = "credentialsJSON:db9685a5-7d42-4bde-92b5-425107d7f4f9"
            }
        }
    }
})

object Publish : BuildType({
    templates(AbsoluteId("DevOps_PublishDockerAndHelm"))
    name = "Publish"

    params {
        param("fromdep.project.name", "${Build.depParamRefs["project.name"]}")
        param("fromdep.build.number", "${Build.depParamRefs.buildNumber}")
        param("fromdep.project.helm.artifact", "${Build.depParamRefs["project.helm.artifact"]}")
        param("project.octopus.project_name", "k8s-dash-app")
        param("project.helm.repoName", "helm-playground")
        param("BranchSpecification", """
            +:refs/heads/(main)
            +:refs/heads/(feature/*)
            +:refs/heads/(hotfix/*)
            +:refs/heads/(release/*)
            +:refs/heads/(develop)
        """.trimIndent())
        param("env.SourceBranch", "main")
        param("fromdep.project.buildTag", "${Build.depParamRefs["project.buildTag"]}")
        param("fromdep.project.docker.artifact", "${Build.depParamRefs["project.docker.artifact"]}")
        param("fromdep.project.docker.imageName", "${Build.depParamRefs["project.docker.imageName"]}")
        param("fromdep.project.buildVersion", "${Build.depParamRefs["project.buildVersion"]}")
        param("project.octopus.space_name", "playground")
    }

    vcs {
        root(DslContext.settingsRoot)
    }

    triggers {
        finishBuildTrigger {
            id = "TRIGGER_157"
            buildType = "${Build.id}"
            successfulOnly = true
        }
    }

    dependencies {
        dependency(Build) {
            snapshot {
                onDependencyFailure = FailureAction.FAIL_TO_START
            }

            artifacts {
                id = "ARTIFACT_DEPENDENCY_132"
                artifactRules = """
                    %fromdep.project.docker.artifact%
                """.trimIndent()
            }
            artifacts {
                id = "ARTIFACT_DEPENDENCY_278"
                artifactRules = "%fromdep.project.helm.artifact%"
            }
        }
    }
})
