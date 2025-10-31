/*
This is the Jenkinsfile for the Blue-Green deployment.
It assumes:
1. A Docker Hub credential with ID 'dockerhub-credentials'.
2. A Kubernetes credential with ID 'kubeconfig'.
3. A 'service.yaml' file that initially points to 'version: blue'.
*/
pipeline {
    agent any

    environment {
        // Your Docker Hub username + repository name
        DOCK_IMAGE = "rohhxn/myapp-bluegreen"
        // Jenkins build number will be our version tag (e.g., v1, v2, v3)
        VERSION_TAG = "v${env.BUILD_NUMBER}"
    }

    stages {
        stage('1. Build & Push Docker Image') {
            steps {
                script {
                    echo "Building image: ${DOCK_IMAGE}:${VERSION_TAG}"
                    // Build the Docker image
                    def customImage = docker.build(DOCK_IMAGE, "--build-arg APP_VERSION=${VERSION_TAG} .")
                    
                    // Log in to Docker Hub and push the image
                    docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-credentials') {
                        customImage.push(VERSION_TAG)
                    }
                }
            }
        }

        stage('2. Blue/Green Deploy') {
            steps {
                // Use the kubeconfig credential to connect to our cluster
                // FIX: Changed 'context' to 'contextName' as required by the plugin
                withKubeConfig([credentialsId: 'kubeconfig', contextName: 'default']) {
                    script {
                        // --- Create the service if it doesn't exist ---
                        // This makes the pipeline safe to run on the first build
                        echo "Applying service definition to ensure it exists..."
                        sh "kubectl apply -f service.yaml"

                        // --- Determine which color is live and which is inactive ---
                        def currentLiveColor = sh(script: "kubectl get service myapp-service -o jsonpath='{.spec.selector.version}'", returnStdout: true).trim()
                        
                        // If the service doesn't have a label (e.g., bad state), default to 'blue'
                        if (!currentLiveColor) {
                            currentLiveColor = 'blue'
                        }

                        def newDeployColor = (currentLiveColor == 'blue') ? 'green' : 'blue'
                        
                        echo "Current live version is: ${currentLiveColor}"
                        echo "Deploying new version to: ${newDeployColor}"

                        // --- Deploy the new/inactive version ---
                        def newDeploymentFile = "deployment-${newDeployColor}.yaml"
                        
                        // Create a temporary copy to replace placeholders
                        sh "cp ${newDeploymentFile} ${newDeploymentFile}-temp"
                        // Replace __IMAGE_TAG__ with our new image (e..g, rohhxn/myapp-bluegreen:v3)
                        sh "sed -i 's|__IMAGE_TAG__|${VERSION_TAG}|g' ${newDeploymentFile}-temp"
                        // Replace __VERSION__ with our new version string (e.g., v3)
                        sh "sed -i 's|__VERSION__|${VERSION_TAG}|g' ${newDeploymentFile}-temp"
                        
                        echo "Applying deployment for ${newDeployColor}..."
                        // Scale up the new deployment
                        sh "kubectl apply -f ${newDeploymentFile}-temp"
                        sh "kubectl scale deployment myapp-${newDeployColor} --replicas=2"
                        sh "echo 'Waiting for ${newDeployColor} deployment to complete...'"
                        // Wait for the new pods to be healthy
                        sh "kubectl rollout status deployment/myapp-${newDeployColor}"
                        
                        // --- PAUSE FOR MANUAL APPROVAL ---
                        timeout(time: 5, unit: 'MINUTES') {
                            input message: "Promote ${newDeployColor} to live? (Currently serving ${currentLiveColor})"
                        }

                        // --- Switch the service traffic ---
                        echo "Switching service to point to ${newDeployColor}..."
                        def patchCommand = "kubectl patch service myapp-service -p '{\"spec\":{\"selector\":{\"version\":\"${newDeployColor}\"}}}'"
                        sh patchCommand
                        echo "Successfully switched traffic. ${newDeployColor} is now live!"

                        // --- Scale down the old deployment ---
                        echo "Scaling down old ${currentLiveColor} deployment..."
                        sh "kubectl scale deployment myapp-${currentLiveColor} --replicas=0"
                    }
                }
            }
        }
    }
}
