package com.campus.transparency.testconfig;

import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.springframework.test.context.ActiveProfiles;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@AutoConfigureEmbeddedDatabase
@ActiveProfiles("test")
public @interface IsolatedTestDatabase {
}
