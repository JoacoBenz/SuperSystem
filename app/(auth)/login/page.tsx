'use client';

import { Form, Input, Button, Typography, Divider, App, Space } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined, WindowsOutlined } from '@ant-design/icons';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const { Title, Text, Link } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  async function handleSubmit(values: { email: string; password: string }) {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      message.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={2} style={{ margin: 0, fontSize: 28 }}>Welcome back</Title>
        <Text type="secondary">Sign in to your ERP Platform account</Text>
      </div>

      <Form onFinish={handleSubmit} layout="vertical" size="large">
        <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
          <Input prefix={<UserOutlined />} placeholder="Email" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <Divider>or</Divider>

      <Space orientation="vertical" style={{ width: '100%' }}>
        <Button icon={<GoogleOutlined />} block onClick={() => signIn('google', { callbackUrl: '/' })}>
          Sign in with Google
        </Button>
        <Button icon={<WindowsOutlined />} block onClick={() => signIn('microsoft-entra-id', { callbackUrl: '/' })}>
          Sign in with Microsoft
        </Button>
      </Space>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text>Don&apos;t have an account? </Text>
        <Link href="/register">Register</Link>
        <Text> or </Text>
        <Link href="/join">Join with code</Link>
      </div>
    </div>
  );
}
