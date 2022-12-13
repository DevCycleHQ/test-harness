package com.dvc_harness.proxy;

import java.util.Collections;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ProxyApplication {

	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(ProxyApplication.class);
		app.setDefaultProperties(Collections.singletonMap("server.port", "3000"));
		app.run(args);
	}

}