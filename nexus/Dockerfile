FROM sonatype/nexus3:latest

USER root

RUN microdnf install -y yum-utils && \
    microdnf clean all

USER nexus

ENV INSTALL4J_ADD_VM_PARAMS="-Xms512m -Xmx1024m -XX:MaxDirectMemorySize=512m"

EXPOSE 8081
