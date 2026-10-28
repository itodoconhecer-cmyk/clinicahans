FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -Dmaven.test.skip=true

FROM eclipse-temurin:25-jre
RUN groupadd --system clinicahans && useradd --system --gid clinicahans --home-dir /app clinicahans
WORKDIR /app
COPY --from=build --chown=clinicahans:clinicahans /build/target/clinicahans-backend-*.jar app.jar
RUN mkdir logs && chown clinicahans:clinicahans logs
USER clinicahans
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "/app/app.jar"]
