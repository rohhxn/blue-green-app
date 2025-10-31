pipeline {
    agent any

    environment {
        // !!! CHANGE 'rohhxn' to your Docker Hub username !!!
        DOCKER_IMAGE_NAME = "rohhxn/myapp-bluegreen" 
        KUBE_CONFIG = credentials('kubeconfig')
    }

    stages {
        // Jenkins automatically checks out the code, so no 'Checkout' stage needed

        stage('Build & Push Docker Image') {
            steps {
                script {
                    def imageTag = "v${env.BUILD_NUMBER}"
                    docker.build("${DOCKER_IMAGE_NAME}:${imageTag}", ".")
                    docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-credentials') {
                        docker.image("${DOCKER_IMAGE_NAME}:${imageTag}").push()
                    }
                }
            }
        }

        stage('Blue/Green Deploy') {
            steps {
                script {
                    def imageTag = "v${env.BUILD_NUMBER}"
                    
                    // Use withKubeConfig for all kubectl commands
                    withKubeConfig([credentialsId: 'kubeconfig', context: 'default']) {
                        
                        // 1. Determine current live color
                        // We run this *without* -o jsonpath to avoid errors if the service doesn't exist
                        // !!! FIX: Removed 'sudo' !!!
                        def currentColor = sh(script: "kubectl get service myapp-service -o=jsonpath='{.spec.selector.version}' || echo 'blue'", returnStdout: true).trim()
                        if (currentColor.contains("No resources")) {
                            currentColor = "blue"
                        }
                        echo "Current live version is: ${currentColor}"

                        def newDeployColor = (currentColor == 'blue') ? 'green' : 'blue'
                        echo "Deploying new version to: ${newDeployColor}"

                        // 2. Deploy the new version to the inactive color
                        def newDeploymentFile = "deployment-${newDeployColor}.yaml"
                        
                        // We have two placeholders to replace now!
                        sh "cp ${newDeploymentFile} ${newDeploymentFile}-temp"
                        sh "sed -i 's|__IMAGE_TAG__|${imageTag}|g' ${newDeploymentFile}-temp"
                        sh "sed -i 's|__VERSION__|v${env.BUILD_NUMBER}|g' ${newDeploymentFile}-temp"
                        
                        // !!! FIX: Removed 'sudo' !!!
                        sh "kubectl apply -f ${newDeploymentFile}-temp"
                        sh "echo 'Waiting for ${newDeployColor} deployment to complete...'"
                        // !!! FIX: Removed 'sudo' !!!
                        sh "kubectl rollout status deployment/myapp-${newDeployColor}"
                        
                        // 3. Manual Approval Step
                        timeout(time: 5, unit: 'MINUTES') {
                            input message: "Promote ${newDeployColor} to live? (Currently serving ${currentColor})"
                        }

                        // 4. Switch Service to point to the new version
                        echo "Switching service to point to ${newDeployColor}"
                        // !!! FIX: Removed 'sudo' !!!
                        def patchCommand = "kubectl patch service myapp-service -p '{\"spec\":{\"selector\":{\"version\":\"${newDeployColor}\"}}}'"
                        sh patchCommand

                        echo "Deployment successful. ${newDeployColor} is now live."

                        // 5. (Optional) Scale down the old environment
                        echo "Scaling down old deployment ${currentColor}..."
                        // !!! FIX: Removed 'sudo' !!!
                        sh "kubectl scale deployment myapp-${currentColor} --replicas=0"
                    }
                }
            }
        }
    }
}
